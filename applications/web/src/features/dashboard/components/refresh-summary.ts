import { type } from "arktype";
import { translate, type Translate } from "@/i18n";

const refreshCalendarsResponseSchema = type({
  accounts: "number",
  added: "number",
  cooldownSeconds: "number",
  failed: "number",
  revived: "number",
  unavailable: "number",
});

type RefreshCalendarsResponse = typeof refreshCalendarsResponseSchema.infer;

interface RefreshCounts {
  added: number;
  revived: number;
  unavailable: number;
}

const inEnglish: Translate = (text, values) => translate("en", text, values);

function buildChangeClauses({ added, revived }: RefreshCounts, t: Translate): string[] {
  const clauses: string[] = [];

  if (added > 0) {
    clauses.push(
      added === 1
        ? t("Found {count} new calendar.", { count: added })
        : t("Found {count} new calendars.", { count: added }),
    );
  }
  if (revived > 0) {
    clauses.push(
      revived === 1
        ? t("{count} calendar is available again.", { count: revived })
        : t("{count} calendars are available again.", { count: revived }),
    );
  }

  return clauses;
}

export function formatRefreshSummary(counts: RefreshCounts, t: Translate = inEnglish): string {
  const clauses = buildChangeClauses(counts, t);

  if (counts.unavailable > 0) {
    clauses.push(
      counts.unavailable === 1
        ? t("{count} calendar is no longer available.", { count: counts.unavailable })
        : t("{count} calendars are no longer available.", { count: counts.unavailable }),
    );
  }

  if (clauses.length === 0) {
    return t("No new calendars found.");
  }

  return clauses.join(" ");
}

export function formatRefreshFailures(failed: number, t: Translate = inEnglish): string | null {
  if (failed === 0) return null;

  return failed === 1
    ? t("{count} account could not be refreshed. Open the account to reconnect it.", { count: failed })
    : t("{count} accounts could not be refreshed. Open the account to reconnect it.", { count: failed });
}

export { refreshCalendarsResponseSchema };
export type { RefreshCalendarsResponse };
