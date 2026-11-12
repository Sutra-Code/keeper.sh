import { createHash } from "node:crypto";
import { apiTokensTable } from "@keeper.sh/database/schema";
import { eq } from "drizzle-orm";
import type { BunSQLDatabase } from "drizzle-orm/bun-sql";

const API_TOKEN_PREFIX = "kpr_";

const isApiToken = (value: string): boolean => value.startsWith(API_TOKEN_PREFIX);

const hashApiToken = (token: string): string => createHash("sha256").update(token).digest("hex");

type ApiTokenUserResolver = (token: string) => Promise<string | null>;

/**
 * Resolves the owner of a `kpr_` API token, so an MCP client can authenticate
 * with a token from Settings instead of the OAuth flow. The API validates the
 * same token again on every tool call and records its use.
 */
const createApiTokenUserResolver =
  (database: BunSQLDatabase): ApiTokenUserResolver =>
  async (token) => {
    const [match] = await database
      .select({
        expiresAt: apiTokensTable.expiresAt,
        userId: apiTokensTable.userId,
      })
      .from(apiTokensTable)
      .where(eq(apiTokensTable.tokenHash, hashApiToken(token)))
      .limit(1);

    if (!match) {
      return null;
    }

    if (match.expiresAt && match.expiresAt.getTime() < Date.now()) {
      return null;
    }

    return match.userId;
  };

export { createApiTokenUserResolver, isApiToken };
export type { ApiTokenUserResolver };
