import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MICROSOFT_APPS_IN_DATABASE,
  getMicrosoftApps,
  loadMicrosoftApps,
  setStoredMicrosoftApps,
  readRefreshToken,
  tagRefreshToken,
  withPrimaryMicrosoftApp,
} from "../../../src/core/oauth/microsoft-apps";
import {
  createMicrosoftOAuthService,
  createMicrosoftTokenRefresher,
} from "../../../src/core/oauth/microsoft";
import { validateState } from "../../../src/core/oauth/state";

const MS_PER_SECOND = 1000;
const CALLBACK_URL = "https://calendar.test.invalid/api/sources/callback/outlook";

const createTestStateStore = () => {
  const store = new Map<string, { value: string; expiresAt: number }>();
  return {
    consume: (key: string) => {
      const entry = store.get(key);
      if (!entry) {
        return Promise.resolve(null);
      }
      store.delete(key);
      return Promise.resolve(entry.value);
    },
    set: (key: string, value: string, ttlSeconds: number) => {
      store.set(key, { expiresAt: Date.now() + ttlSeconds * MS_PER_SECOND, value });
      return Promise.resolve();
    },
  };
};

const NAMED_APPS_ENV = {
  MICROSOFT_ORIONTEK_CLIENT_ID: "oriontek-client",
  MICROSOFT_ORIONTEK_CLIENT_SECRET: "oriontek-secret",
  MICROSOFT_ORIONTEK_TENANT_ID: "oriontek-tenant",
  MICROSOFT_SUTRA_CLIENT_ID: "sutra-client",
  MICROSOFT_SUTRA_CLIENT_SECRET: "sutra-secret",
  MICROSOFT_SUTRA_LABEL: "SutraCode",
  MICROSOFT_WEILGROUP_CLIENT_ID: "weilgroup-client",
  MICROSOFT_WEILGROUP_CLIENT_SECRET: "weilgroup-secret",
};

const tokenResponse = (refreshToken: string) =>
  Response.json({
    access_token: "access",
    expires_in: 3600,
    refresh_token: refreshToken,
    scope: "Calendars.ReadWrite User.Read offline_access",
    token_type: "Bearer",
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadMicrosoftApps", () => {
  it("reads every named app, with its tenant and label", () => {
    const apps = loadMicrosoftApps(NAMED_APPS_ENV);

    expect(apps.map((app) => [app.key, app.label, app.tenantId])).toEqual([
      ["oriontek", "Oriontek", "oriontek-tenant"],
      ["sutra", "SutraCode", "common"],
      ["weilgroup", "Weilgroup", "common"],
    ]);
  });

  it("keeps the plain pair as the default app and skips an app without a secret", () => {
    const apps = loadMicrosoftApps({
      MICROSOFT_CLIENT_ID: "legacy-client",
      MICROSOFT_CLIENT_SECRET: "legacy-secret",
      MICROSOFT_HALF_CLIENT_ID: "half-client",
    });

    expect(apps.map((app) => app.key)).toEqual(["default"]);
  });

  it("lets named apps open the MICROSOFT_CLIENT_ID gates", () => {
    const env = withPrimaryMicrosoftApp<{ MICROSOFT_CLIENT_ID?: string }>({}, NAMED_APPS_ENV);

    expect(env.MICROSOFT_CLIENT_ID).toBe("oriontek-client");
  });

  it("keeps the gates open for apps that only live in the database", () => {
    expect(withPrimaryMicrosoftApp<{ MICROSOFT_CLIENT_ID?: string }>({}, {}).MICROSOFT_CLIENT_ID).toBe(MICROSOFT_APPS_IN_DATABASE);
  });
});

describe("getMicrosoftApps", () => {
  afterEach(() => {
    setStoredMicrosoftApps([]);
  });

  it("adds the apps saved in the database, which win over the environment on the same key", () => {
    setStoredMicrosoftApps([
      { clientId: "db-sutra", clientSecret: "s", key: "sutra", label: "SutraCode DB", tenantId: "t" },
      { clientId: "db-new", clientSecret: "s", key: "acme", label: "Acme", tenantId: "common" },
    ]);

    const apps = getMicrosoftApps(NAMED_APPS_ENV);

    expect(apps.map((app) => [app.key, app.clientId])).toEqual([
      ["oriontek", "oriontek-client"],
      ["weilgroup", "weilgroup-client"],
      ["sutra", "db-sutra"],
      ["acme", "db-new"],
    ]);
  });

  it("refreshes a token tagged with an app added after the refresher was created", async () => {
    const refresh = createMicrosoftTokenRefresher({
      clientId: MICROSOFT_APPS_IN_DATABASE,
      clientSecret: MICROSOFT_APPS_IN_DATABASE,
    });
    setStoredMicrosoftApps([
      { clientId: "db-new", clientSecret: "s", key: "acme", label: "Acme", tenantId: "acme-tenant" },
    ]);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(tokenResponse("rotated"));

    const tokens = await refresh("msapp:acme:stored");

    expect(tokens.refresh_token).toBe("msapp:acme:rotated");
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
      "https://login.microsoftonline.com/acme-tenant/oauth2/v2.0/token",
    );
  });
});

describe("refresh token tags", () => {
  it("round-trips the app key", () => {
    expect(readRefreshToken(tagRefreshToken("sutra", "abc:def"))).toEqual({
      appKey: "sutra",
      refreshToken: "abc:def",
    });
  });

  it("treats an untagged token as the default app's", () => {
    expect(readRefreshToken("plain-token")).toEqual({ appKey: null, refreshToken: "plain-token" });
  });
});

describe("Microsoft OAuth with several apps", () => {
  const apps = loadMicrosoftApps(NAMED_APPS_ENV);
  const fallback = { clientId: "oriontek-client", clientSecret: "oriontek-secret" };

  it("authorizes against the chosen app's tenant and remembers the app in the state", async () => {
    const store = createTestStateStore();
    const service = createMicrosoftOAuthService(fallback, store, apps);

    const url = new URL(await service.getAuthorizationUrl("user-1", {
      callbackUrl: CALLBACK_URL,
      microsoftApp: "oriontek",
    }));

    expect(url.pathname).toBe("/oriontek-tenant/oauth2/v2.0/authorize");
    expect(url.searchParams.get("client_id")).toBe("oriontek-client");
    const state = await validateState(store, url.searchParams.get("state") ?? "");
    expect(state?.microsoftApp).toBe("oriontek");
  });

  it("rejects an app that is not configured", async () => {
    const service = createMicrosoftOAuthService(fallback, createTestStateStore(), apps);

    await expect(service.getAuthorizationUrl("user-1", {
      callbackUrl: CALLBACK_URL,
      microsoftApp: "unknown",
    })).rejects.toThrow('Microsoft app "unknown" is not configured');
  });

  it("tags the refresh token with the app that exchanged the code", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(tokenResponse("issued"));
    const service = createMicrosoftOAuthService(fallback, createTestStateStore(), apps);

    const tokens = await service.exchangeCodeForTokens("code", CALLBACK_URL, "sutra");

    expect(tokens.refresh_token).toBe("msapp:sutra:issued");
    const [requestUrl, init] = fetchSpy.mock.calls[0] ?? [];
    expect(String(requestUrl)).toBe("https://login.microsoftonline.com/common/oauth2/v2.0/token");
    expect(String(init?.body)).toContain("client_id=sutra-client");
  });

  it("refreshes a tagged token with its own app and keeps the tag", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(tokenResponse("rotated"));
    const refresh = createMicrosoftTokenRefresher(fallback, apps);

    const tokens = await refresh("msapp:weilgroup:stored");

    expect(tokens.refresh_token).toBe("msapp:weilgroup:rotated");
    const body = new URLSearchParams(String(fetchSpy.mock.calls[0]?.[1]?.body));
    expect(body.get("client_id")).toBe("weilgroup-client");
    expect(body.get("refresh_token")).toBe("stored");
  });

  it("refreshes an untagged token with the passed credentials", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(tokenResponse("rotated"));
    const refresh = createMicrosoftTokenRefresher(fallback, apps);

    const tokens = await refresh("legacy");

    expect(tokens.refresh_token).toBe("rotated");
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
      "https://login.microsoftonline.com/oriontek-tenant/oauth2/v2.0/token",
    );
  });
});
