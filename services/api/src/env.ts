import arkenv from "arkenv";
import { withPrimaryMicrosoftApp } from "@keeper.sh/calendar/microsoft-apps";

const schema = {
  API_PORT: "number",
  BETTER_AUTH_SECRET: "string",
  BETTER_AUTH_URL: "string.url",
  COMMERCIAL_MODE: "boolean?",
  DATABASE_POOL_MAX: "number?",
  DATABASE_URL: "string.url",
  ENCRYPTION_KEY: "string?",
  /** Comma-separated usernames allowed to manage Microsoft apps in settings. */
  SETTINGS_ADMIN_USERNAMES: "string?",
  FEEDBACK_EMAIL: "string?",
  GOOGLE_CLIENT_ID: "string?",
  GOOGLE_CLIENT_SECRET: "string?",
  GOOGLE_PROJECT_REQUESTS_PER_MINUTE: "number?",
  MICROSOFT_CLIENT_ID: "string?",
  MICROSOFT_CLIENT_SECRET: "string?",
  OIDC_ISSUER_URL: "string.url?",
  OIDC_CLIENT_ID: "string?",
  OIDC_CLIENT_SECRET: "string?",
  OIDC_PROVIDER_NAME: "string?",
  OIDC_SCOPES: "string?",
  DISABLE_LOCAL_AUTH: "boolean?",
  MCP_API_URL: "string.url?",
  MCP_PUBLIC_URL: "string.url?",
  PASSKEY_ORIGIN: "string?",
  PASSKEY_RP_ID: "string?",
  PASSKEY_RP_NAME: "string?",
  POLAR_ACCESS_TOKEN: "string?",
  POLAR_MODE: "'sandbox' | 'production' | undefined?",
  POLAR_WEBHOOK_SECRET: "string?",
  REDIS_URL: "string.url",
  REGISTRATION_EMAIL_DOMAINS: "string?",
  RESEND_API_KEY: "string?",
  PRIVATE_RESOLUTION_WHITELIST: "string?",
  BLOCK_PRIVATE_RESOLUTION: "boolean?",
  TRUSTED_ORIGINS: "string?",
  WEBHOOK_PUBLIC_URL: "string.url?",
  WEBSOCKET_URL: "string.url?",
} as const;

export { schema };
// Named Microsoft apps (MICROSOFT_<KEY>_CLIENT_ID) also open the MICROSOFT_CLIENT_ID gates.
export default withPrimaryMicrosoftApp(arkenv(schema));
