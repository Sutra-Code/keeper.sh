import {
  calendarAccountsTable,
  calendarsTable,
  sourceIngestScheduleTable,
  syncStatusTable,
} from "@keeper.sh/database/schema";
import { asc, eq, count, max } from "drizzle-orm";
import { withAuth, withWideEvent } from "@/utils/middleware";
import { database } from "@/context";
import { withAccountDisplay } from "@/utils/provider-display";
import { withLastSyncedAt } from "@/utils/account-last-synced";

const GET = withWideEvent(
  withAuth(async ({ userId }) => {
    const accounts = await database
      .select({
        id: calendarAccountsTable.id,
        provider: calendarAccountsTable.provider,
        displayName: calendarAccountsTable.displayName,
        color: calendarAccountsTable.color,
        email: calendarAccountsTable.email,
        accountIdentifier: calendarAccountsTable.accountId,
        authType: calendarAccountsTable.authType,
        needsReauthentication: calendarAccountsTable.needsReauthentication,
        calendarCount: count(calendarsTable.id),
        calendarsRefreshedAt: calendarAccountsTable.calendarsRefreshedAt,
        createdAt: calendarAccountsTable.createdAt,
        lastReadAt: max(sourceIngestScheduleTable.lastSuccessAt),
        lastPushedAt: max(syncStatusTable.lastSyncedAt),
      })
      .from(calendarAccountsTable)
      .leftJoin(calendarsTable, eq(calendarsTable.accountId, calendarAccountsTable.id))
      .leftJoin(sourceIngestScheduleTable, eq(sourceIngestScheduleTable.calendarId, calendarsTable.id))
      .leftJoin(syncStatusTable, eq(syncStatusTable.calendarId, calendarsTable.id))
      .where(eq(calendarAccountsTable.userId, userId))
      .groupBy(calendarAccountsTable.id)
      .orderBy(asc(calendarAccountsTable.createdAt));

    return Response.json(accounts.map((account) => withAccountDisplay(withLastSyncedAt(account))));
  }),
);

export { GET };
