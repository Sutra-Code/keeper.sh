import { microsoftTokenResponseSchema, microsoftUserInfoSchema } from "@keeper.sh/data-schemas";
import type { MicrosoftTokenResponse, MicrosoftUserInfo } from "@keeper.sh/data-schemas";
import { generateState, validateState } from "./state";
import type { ValidatedState, OAuthStateStore } from "./state";
import {
  DEFAULT_APP_KEY,
  findMicrosoftApp,
  loadMicrosoftApps,
  microsoftAuthorizeUrl,
  microsoftTokenUrl,
  readRefreshToken,
  tagRefreshToken,
} from "./microsoft-apps";
import type { MicrosoftApp } from "./microsoft-apps";

const DEFAULT_TENANT = "common";
const MICROSOFT_USERINFO_URL = "https://graph.microsoft.com/v1.0/me";

const MICROSOFT_CALENDAR_SCOPE = "Calendars.ReadWrite";
const MICROSOFT_USER_SCOPE = "User.Read";
const MICROSOFT_OFFLINE_SCOPE = "offline_access";
const REQUEST_TIMEOUT_MS = 15_000;

const isRequestTimeoutError = (error: unknown): boolean =>
  error instanceof Error
  && (error.name === "AbortError" || error.name === "TimeoutError");

interface MicrosoftOAuthCredentials {
  clientId: string;
  clientSecret: string;
}

interface AuthorizationUrlOptions {
  callbackUrl: string;
  scopes?: string[];
  destinationId?: string;
  sourceCredentialId?: string;
  /** Pins the consent screen to one account, so a reconnect cannot reauthorize the wrong one. */
  loginHint?: string;
  /** Key of the Microsoft app registration to authorize with; the first configured one when absent. */
  microsoftApp?: string;
}

interface MicrosoftOAuthService {
  getAuthorizationUrl: (userId: string, options: AuthorizationUrlOptions) => Promise<string>;
  exchangeCodeForTokens: (
    code: string,
    callbackUrl: string,
    microsoftApp?: string | null,
  ) => Promise<MicrosoftTokenResponse>;
  refreshAccessToken: (refreshToken: string) => Promise<MicrosoftTokenResponse>;
}

/** The app a token belongs to: its tag when it has one, otherwise the passed credentials. */
const resolveRefreshApp = (
  credentials: MicrosoftOAuthCredentials,
  apps: MicrosoftApp[],
  appKey: string | null,
): MicrosoftApp => {
  if (appKey) {
    const tagged = findMicrosoftApp(apps, appKey);
    if (!tagged) {
      throw new Error(`Microsoft app "${appKey}" is not configured`);
    }
    return tagged;
  }
  const matching = apps.find((app) => app.clientId === credentials.clientId);
  return {
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    key: DEFAULT_APP_KEY,
    label: "Microsoft",
    tenantId: matching?.tenantId ?? DEFAULT_TENANT,
  };
};

const createMicrosoftTokenRefresher = (
  credentials: MicrosoftOAuthCredentials,
  apps: MicrosoftApp[] = loadMicrosoftApps(),
) => async (storedRefreshToken: string): Promise<MicrosoftTokenResponse> => {
  const { appKey, refreshToken } = readRefreshToken(storedRefreshToken);
  const app = resolveRefreshApp(credentials, apps, appKey);

  const response = await fetch(microsoftTokenUrl(app.tenantId), {
    body: new URLSearchParams({
      client_id: app.clientId,
      client_secret: app.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((error) => {
    if (isRequestTimeoutError(error)) {
      throw new Error(`Token refresh timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }

    throw error;
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${error}`);
  }

  const body = await response.json();
  const tokens = microsoftTokenResponseSchema.assert(body);
  if (appKey && tokens.refresh_token) {
    return { ...tokens, refresh_token: tagRefreshToken(appKey, tokens.refresh_token) };
  }
  return tokens;
};

const createMicrosoftOAuthService = (
  credentials: MicrosoftOAuthCredentials,
  stateStore: OAuthStateStore,
  configuredApps: MicrosoftApp[] = loadMicrosoftApps(),
): MicrosoftOAuthService => {
  let apps: MicrosoftApp[] = configuredApps;
  if (apps.length === 0) {
    apps = [{ ...credentials, key: DEFAULT_APP_KEY, label: "Microsoft", tenantId: DEFAULT_TENANT }];
  }

  const requireApp = (key: string | null | undefined): MicrosoftApp => {
    const app = findMicrosoftApp(apps, key);
    if (!app) {
      throw new Error(`Microsoft app "${key}" is not configured`);
    }
    return app;
  };

  const getAuthorizationUrl = async (userId: string, options: AuthorizationUrlOptions): Promise<string> => {
    const app = requireApp(options.microsoftApp);
    const state = await generateState(stateStore, userId, {
      destinationId: options.destinationId,
      microsoftApp: app.key,
      sourceCredentialId: options.sourceCredentialId,
    });
    const scopes = options.scopes ?? [
      MICROSOFT_CALENDAR_SCOPE,
      MICROSOFT_USER_SCOPE,
      MICROSOFT_OFFLINE_SCOPE,
    ];

    const url = new URL(microsoftAuthorizeUrl(app.tenantId));
    url.searchParams.set("client_id", app.clientId);
    url.searchParams.set("redirect_uri", options.callbackUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("response_mode", "query");
    // A hinted reconnect targets one account, so the picker would only invite the wrong choice.
    if (options.loginHint) {
      url.searchParams.set("login_hint", options.loginHint);
    } else {
      url.searchParams.set("prompt", "select_account");
    }
    url.searchParams.set("state", state);

    return url.toString();
  };

  const exchangeCodeForTokens = async (
    code: string,
    callbackUrl: string,
    microsoftApp?: string | null,
  ): Promise<MicrosoftTokenResponse> => {
    const app = requireApp(microsoftApp);
    const response = await fetch(microsoftTokenUrl(app.tenantId), {
      body: new URLSearchParams({
        client_id: app.clientId,
        client_secret: app.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl,
      }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed (${response.status}): ${error}`);
    }

    const body = await response.json();
    const tokens = microsoftTokenResponseSchema.assert(body);
    if (!tokens.refresh_token) {
      return tokens;
    }
    return { ...tokens, refresh_token: tagRefreshToken(app.key, tokens.refresh_token) };
  };

  const refreshAccessToken = createMicrosoftTokenRefresher(credentials, apps);

  return {
    exchangeCodeForTokens,
    getAuthorizationUrl,
    refreshAccessToken,
  };
};

const fetchUserInfo = async (accessToken: string): Promise<MicrosoftUserInfo> => {
  const response = await fetch(MICROSOFT_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`);
  }

  const body = await response.json();
  return microsoftUserInfoSchema.assert(body);
};

const MICROSOFT_GRAPH_RESOURCE_PREFIX = "https://graph.microsoft.com/";

// The v2.0 token response returns Graph scopes short-form (Calendars.ReadWrite) or resource-qualified (https://graph.microsoft.com/Calendars.ReadWrite).
const normalizeGrantedScope = (scope: string): string => {
  const lowered = scope.toLowerCase();
  if (lowered.startsWith(MICROSOFT_GRAPH_RESOURCE_PREFIX.toLowerCase())) {
    return lowered.slice(MICROSOFT_GRAPH_RESOURCE_PREFIX.length);
  }
  return lowered;
};

const hasRequiredScopes = (grantedScopes: string): boolean => {
  const scopes = grantedScopes.split(" ").map((scope) => normalizeGrantedScope(scope));
  return scopes.includes(MICROSOFT_CALENDAR_SCOPE.toLowerCase());
};

export {
  createMicrosoftTokenRefresher,
  MICROSOFT_CALENDAR_SCOPE,
  MICROSOFT_USER_SCOPE,
  MICROSOFT_OFFLINE_SCOPE,
  createMicrosoftOAuthService,
  fetchUserInfo,
  hasRequiredScopes,
  validateState,
};
export type {
  ValidatedState,
  MicrosoftOAuthCredentials,
  AuthorizationUrlOptions,
  MicrosoftOAuthService,
  MicrosoftTokenResponse,
  MicrosoftUserInfo,
};
