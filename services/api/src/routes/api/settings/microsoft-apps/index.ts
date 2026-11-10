import { type } from "arktype";
import { HTTP_STATUS } from "@keeper.sh/constants";
import { listStoredMicrosoftApps, saveMicrosoftApp } from "@keeper.sh/calendar";
import { oauthCredentialsTable } from "@keeper.sh/database/schema";
import { and, eq, like, sql } from "drizzle-orm";
import { database, encryptionKey } from "@/context";
import { withAuth, withWideEvent } from "@/utils/middleware";
import { ErrorResponse } from "@/utils/responses";
import { isSettingsAdmin } from "@/utils/settings-admin";

const APP_KEY_PATTERN = /^[a-z0-9]{1,32}$/;
// Entra shows a secret's ID as a GUID next to its Value; pasting the ID fails later with AADSTS7000215.
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const microsoftAppBodySchema = type({
  key: "string",
  label: "string",
  clientId: "string",
  "tenantId?": "string | null",
  "clientSecret?": "string | null",
  "+": "reject",
});

const countConnectedAccounts = async (key: string): Promise<number> => {
  const [row] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(oauthCredentialsTable)
    .where(and(
      eq(oauthCredentialsTable.provider, "outlook"),
      like(oauthCredentialsTable.refreshToken, `msapp:${key}:%`),
    ));
  return row?.count ?? 0;
};

const GET = withWideEvent(
  withAuth(async ({ userId }) => {
    if (!(await isSettingsAdmin(userId))) {
      return ErrorResponse.forbidden().toResponse();
    }
    const apps = await listStoredMicrosoftApps(database);
    const withCounts = await Promise.all(apps.map(async (app) => ({
      ...app,
      connectedAccounts: await countConnectedAccounts(app.key),
    })));
    return Response.json({ apps: withCounts, encryptionReady: Boolean(encryptionKey) });
  }),
);

const POST = withWideEvent(
  withAuth(async ({ userId, request }) => {
    if (!(await isSettingsAdmin(userId))) {
      return ErrorResponse.forbidden().toResponse();
    }
    const body = microsoftAppBodySchema(await request.json().catch(() => null));
    if (body instanceof type.errors) {
      return ErrorResponse.badRequest("Invalid Microsoft app.").toResponse();
    }
    const key = body.key.trim().toLowerCase();
    if (!APP_KEY_PATTERN.test(key)) {
      return ErrorResponse.badRequest("The key uses only lowercase letters and digits.").toResponse();
    }
    if (!body.label.trim() || !body.clientId.trim()) {
      return ErrorResponse.badRequest("Name and client ID are required.").toResponse();
    }
    if (body.clientSecret && GUID_PATTERN.test(body.clientSecret.trim())) {
      return ErrorResponse.badRequest(
        "That is the secret's ID. Paste its Value from Certificates & secrets in Entra.",
      ).toResponse();
    }
    if (!encryptionKey) {
      return ErrorResponse.badRequest("ENCRYPTION_KEY is not configured.").toResponse();
    }
    try {
      await saveMicrosoftApp({ database, encryptionKey }, { ...body, key });
    } catch (error) {
      let message = "Could not save the app.";
      if (error instanceof Error) {
        ({ message } = error);
      }
      return ErrorResponse.badRequest(message).toResponse();
    }
    return new Response(null, { status: HTTP_STATUS.NO_CONTENT });
  }),
);

export { GET, POST };
