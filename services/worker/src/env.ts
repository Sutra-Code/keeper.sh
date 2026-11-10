import arkenv from "arkenv";
import { withPrimaryMicrosoftApp } from "@keeper.sh/calendar/microsoft-apps";

const schema = {
  BLOCK_PRIVATE_RESOLUTION: "boolean?",
  DATABASE_POOL_MAX: "number?",
  DATABASE_URL: "string.url",
  ENCRYPTION_KEY: "string?",
  GOOGLE_CLIENT_ID: "string?",
  GOOGLE_CLIENT_SECRET: "string?",
  GOOGLE_PROJECT_REQUESTS_PER_MINUTE: "number?",
  MICROSOFT_CLIENT_ID: "string?",
  MICROSOFT_CLIENT_SECRET: "string?",
  PRIVATE_RESOLUTION_WHITELIST: "string?",
  REDIS_URL: "string.url",
  WORKER_CONCURRENCY: "string?",
} as const;

export { schema };
// Named Microsoft apps (MICROSOFT_<KEY>_CLIENT_ID) also open the MICROSOFT_CLIENT_ID gates.
export default withPrimaryMicrosoftApp(arkenv(schema));
