import { HTTP_STATUS } from "@keeper.sh/constants";
import { deleteMicrosoftApp } from "@keeper.sh/calendar";
import { database, encryptionKey } from "@/context";
import { withAuth, withWideEvent } from "@/utils/middleware";
import { ErrorResponse } from "@/utils/responses";
import { isSettingsAdmin } from "@/utils/settings-admin";

/** Accounts connected through the app stop refreshing until it is added again with the same key. */
const DELETE = withWideEvent(
  withAuth(async ({ userId, params }) => {
    if (!(await isSettingsAdmin(userId))) {
      return ErrorResponse.forbidden().toResponse();
    }
    if (!params.key) {
      return ErrorResponse.badRequest("App key is required.").toResponse();
    }
    await deleteMicrosoftApp({ database, encryptionKey }, params.key);
    return new Response(null, { status: HTTP_STATUS.NO_CONTENT });
  }),
);

export { DELETE };
