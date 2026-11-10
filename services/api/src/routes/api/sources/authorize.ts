import { calendarAccountsTable, oauthCredentialsTable } from "@keeper.sh/database/schema";
import { findMicrosoftApp, getMicrosoftApps, readMicrosoftRefreshToken } from "@keeper.sh/calendar";
import { and, eq } from "drizzle-orm";
import { withAuth, withWideEvent } from "@/utils/middleware";
import { ErrorResponse } from "@/utils/responses";
import { widelog } from "@/utils/logging";
import { getAuthorizationUrl, isOAuthProvider } from "@/utils/destinations";
import { sourceAuthorizeQuerySchema } from "@/utils/request-query";
import { baseUrl, database } from "@/context";

const FIRST_RESULT_LIMIT = 1;

interface ReconnectTarget {
  credentialId: string | null;
  loginHint: string | null;
}

/**
 * Resolves the account being restored. The login hint is read from the stored row rather than
 * the query so a reconnect can only ever target the account that actually broke.
 */
const resolveReconnectTarget = async (
  userId: string,
  accountId: string,
): Promise<ReconnectTarget | null> => {
  const [account] = await database
    .select({
      credentialId: calendarAccountsTable.oauthCredentialId,
      email: calendarAccountsTable.email,
    })
    .from(calendarAccountsTable)
    .where(
      and(
        eq(calendarAccountsTable.id, accountId),
        eq(calendarAccountsTable.userId, userId),
      ),
    )
    .limit(FIRST_RESULT_LIMIT);

  if (!account) {
    return null;
  }

  /* Only an email can pin a consent screen. calendar_accounts.accountId holds an opaque
     provider identifier, so hinting with it would suppress Microsoft's account picker
     while naming an account it cannot resolve. */
  const email = account.email?.trim();
  if (!email) {
    return { credentialId: account.credentialId, loginHint: null };
  }

  return { credentialId: account.credentialId, loginHint: email };
};

interface OwnedCredential {
  /** The Microsoft app that issued the stored token, so a reconnect goes back to the same one. */
  microsoftApp: string | null;
}

const findOwnedSourceCredential = async (
  userId: string,
  credentialId: string,
): Promise<OwnedCredential | null> => {
  const [credential] = await database
    .select({ refreshToken: oauthCredentialsTable.refreshToken })
    .from(oauthCredentialsTable)
    .where(
      and(
        eq(oauthCredentialsTable.id, credentialId),
        eq(oauthCredentialsTable.userId, userId),
      ),
    )
    .limit(FIRST_RESULT_LIMIT);

  if (!credential) {
    return null;
  }
  return { microsoftApp: readMicrosoftRefreshToken(credential.refreshToken).appKey };
};

/** Why an Outlook authorization cannot use the requested app, or null when it can. */
const rejectMicrosoftApp = (microsoftApp: string | null): string | null => {
  const apps = getMicrosoftApps();
  if (apps.length === 0) {
    return "Unsupported provider";
  }
  if (microsoftApp && !findMicrosoftApp(apps, microsoftApp)) {
    return "Unknown Microsoft app";
  }
  return null;
};

const GET = withWideEvent(
  withAuth(async ({ request, userId }) => {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const provider = url.searchParams.get("provider");
    const accountId = url.searchParams.get("accountId");
    let credentialId = url.searchParams.get("credentialId");
    let loginHint: string | null = null;
    let microsoftApp = url.searchParams.get("app");

    if (
      !sourceAuthorizeQuerySchema.allows(query)
      || !provider
      || !isOAuthProvider(provider)
    ) {
      return ErrorResponse.badRequest("Unsupported provider").toResponse();
    }

    widelog.set("provider.name", provider);
    widelog.set("oauth.is_reconnect", Boolean(accountId ?? credentialId));

    if (accountId) {
      const target = await resolveReconnectTarget(userId, accountId);
      if (!target) {
        return ErrorResponse.notFound("Calendar account not found").toResponse();
      }
      ({ credentialId, loginHint } = target);
    }

    if (credentialId) {
      const owned = await findOwnedSourceCredential(userId, credentialId);
      if (!owned) {
        return ErrorResponse.notFound("Source credential not found").toResponse();
      }
      microsoftApp = owned.microsoftApp ?? microsoftApp;
    }

    if (provider === "outlook") {
      const rejection = rejectMicrosoftApp(microsoftApp);
      if (rejection) {
        return ErrorResponse.badRequest(rejection).toResponse();
      }
      widelog.set("oauth.microsoft_app", microsoftApp ?? "first");
    } else {
      microsoftApp = null;
    }

    const callbackUrl = new URL(`/api/sources/callback/${provider}`, baseUrl);
    const authorizationOptions: {
      callbackUrl: string;
      sourceCredentialId?: string;
      loginHint?: string;
      microsoftApp?: string;
    } = {
      callbackUrl: callbackUrl.toString(),
    };
    if (credentialId) {
      authorizationOptions.sourceCredentialId = credentialId;
    }
    if (loginHint) {
      authorizationOptions.loginHint = loginHint;
    }
    if (microsoftApp) {
      authorizationOptions.microsoftApp = microsoftApp;
    }
    const authUrl = await getAuthorizationUrl(provider, userId, authorizationOptions);

    return Response.redirect(authUrl);
  }),
);

export { GET };
