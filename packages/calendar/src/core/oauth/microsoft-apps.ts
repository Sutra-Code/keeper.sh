/**
 * Several Microsoft app registrations, one per tenant that will not consent to an app
 * registered elsewhere. Each is configured with
 *   MICROSOFT_<KEY>_CLIENT_ID, MICROSOFT_<KEY>_CLIENT_SECRET,
 *   MICROSOFT_<KEY>_TENANT_ID (optional, defaults to "common") and MICROSOFT_<KEY>_LABEL (optional).
 * The plain MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET / MICROSOFT_TENANT_ID pair keeps
 * working as the app with key "default".
 *
 * A refresh token only works with the app that issued it, so stored refresh tokens carry the
 * app key ("msapp:<key>:<token>"). Every refresh path already hands the stored token to
 * createMicrosoftTokenRefresher, which reads the key back and picks the matching app.
 */

interface MicrosoftApp {
  key: string;
  label: string;
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

type EnvSource = Record<string, string | undefined>;

const DEFAULT_APP_KEY = "default";
const DEFAULT_TENANT = "common";
const SLOT_CLIENT_ID_PATTERN = /^MICROSOFT_([A-Z0-9]+)_CLIENT_ID$/;
const TOKEN_TAG_PREFIX = "msapp:";

const readValue = (source: EnvSource, name: string): string | null => {
  const value = source[name]?.trim();
  if (!value) {
    return null;
  }
  return value;
};

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const loadMicrosoftApps = (source: EnvSource = process.env): MicrosoftApp[] => {
  const apps: MicrosoftApp[] = [];

  const defaultId = readValue(source, "MICROSOFT_CLIENT_ID");
  const defaultSecret = readValue(source, "MICROSOFT_CLIENT_SECRET");
  if (defaultId && defaultSecret) {
    apps.push({
      clientId: defaultId,
      clientSecret: defaultSecret,
      key: DEFAULT_APP_KEY,
      label: readValue(source, "MICROSOFT_LABEL") ?? "Microsoft",
      tenantId: readValue(source, "MICROSOFT_TENANT_ID") ?? DEFAULT_TENANT,
    });
  }

  const slotNames: string[] = [];
  for (const name of Object.keys(source)) {
    const slot = SLOT_CLIENT_ID_PATTERN.exec(name)?.[1];
    if (slot) {
      slotNames.push(slot);
    }
  }
  slotNames.sort();

  for (const slot of slotNames) {
    const clientId = readValue(source, `MICROSOFT_${slot}_CLIENT_ID`);
    const clientSecret = readValue(source, `MICROSOFT_${slot}_CLIENT_SECRET`);
    if (!clientId || !clientSecret) {
      continue;
    }
    const key = slot.toLowerCase();
    apps.push({
      clientId,
      clientSecret,
      key,
      label: readValue(source, `MICROSOFT_${slot}_LABEL`) ?? capitalize(key),
      tenantId: readValue(source, `MICROSOFT_${slot}_TENANT_ID`) ?? DEFAULT_TENANT,
    });
  }

  return apps;
};

const findMicrosoftApp = (
  apps: MicrosoftApp[],
  key: string | null | undefined,
): MicrosoftApp | null => {
  if (!key) {
    return apps[0] ?? null;
  }
  return apps.find((app) => app.key === key) ?? null;
};

/**
 * Service env files gate Microsoft support on MICROSOFT_CLIENT_ID. When only named apps are
 * configured, the first one stands in so those gates stay open; the refresher still routes
 * each tagged token to its own app.
 */
interface MicrosoftEnvGate {
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
}

const withPrimaryMicrosoftApp = <TEnv extends MicrosoftEnvGate>(
  env: TEnv,
  source: EnvSource = process.env,
): TEnv => {
  if (env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET) {
    return env;
  }
  const [primary] = loadMicrosoftApps(source);
  if (!primary) {
    return env;
  }
  return { ...env, MICROSOFT_CLIENT_ID: primary.clientId, MICROSOFT_CLIENT_SECRET: primary.clientSecret };
};

const tagRefreshToken = (appKey: string, refreshToken: string): string =>
  `${TOKEN_TAG_PREFIX}${appKey}:${refreshToken}`;

interface ReadRefreshToken {
  appKey: string | null;
  refreshToken: string;
}

const readRefreshToken = (stored: string): ReadRefreshToken => {
  if (!stored.startsWith(TOKEN_TAG_PREFIX)) {
    return { appKey: null, refreshToken: stored };
  }
  const rest = stored.slice(TOKEN_TAG_PREFIX.length);
  const separator = rest.indexOf(":");
  if (separator <= 0) {
    return { appKey: null, refreshToken: stored };
  }
  return { appKey: rest.slice(0, separator), refreshToken: rest.slice(separator + 1) };
};

const microsoftTokenUrl = (tenantId: string): string =>
  `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;

const microsoftAuthorizeUrl = (tenantId: string): string =>
  `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize`;

export {
  DEFAULT_APP_KEY,
  loadMicrosoftApps,
  findMicrosoftApp,
  withPrimaryMicrosoftApp,
  tagRefreshToken,
  readRefreshToken,
  microsoftTokenUrl,
  microsoftAuthorizeUrl,
};
export type { MicrosoftApp, ReadRefreshToken };
