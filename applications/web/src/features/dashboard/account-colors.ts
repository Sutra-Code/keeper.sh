import { useMemo } from "react";
import useSWR from "swr";
import { ACCOUNT_COLORS, type AccountColor } from "@keeper.sh/data-schemas";
import type { CalendarEvent } from "@/hooks/use-events";
import type { CalendarAccount, CalendarSource } from "@/types/api";

interface ColoredAccount {
  id: string;
  label: string;
  provider: string;
  color: AccountColor;
}

/**
 * Gives every account a colour: the one chosen for it, or else the first palette
 * colour no other account holds, in the order the accounts were connected.
 */
export function resolveAccountColors(
  accounts: readonly Pick<CalendarAccount, "id" | "color">[],
): Map<string, AccountColor> {
  const taken = new Set<AccountColor>();
  for (const account of accounts) {
    if (account.color) taken.add(account.color);
  }

  const colors = new Map<string, AccountColor>();
  let automatic = 0;

  for (const account of accounts) {
    if (account.color) {
      colors.set(account.id, account.color);
      continue;
    }

    const free = ACCOUNT_COLORS.find((color) => !taken.has(color));
    const color = free ?? ACCOUNT_COLORS[automatic % ACCOUNT_COLORS.length];
    automatic += 1;
    taken.add(color);
    colors.set(account.id, color);
  }

  return colors;
}

const NO_ACCOUNTS: CalendarAccount[] = [];
const NO_CALENDARS: CalendarSource[] = [];

export function useAccountColors() {
  const { data: accounts = NO_ACCOUNTS } = useSWR<CalendarAccount[]>("/api/accounts");
  const { data: calendars = NO_CALENDARS } = useSWR<CalendarSource[]>("/api/sources");

  return useMemo(() => {
    const colorByAccountId = resolveAccountColors(accounts);

    const coloredAccounts: ColoredAccount[] = accounts.map((account) => ({
      color: colorByAccountId.get(account.id) ?? ACCOUNT_COLORS[0],
      id: account.id,
      label: account.accountLabel,
      provider: account.provider,
    }));

    const accountIdByCalendarId = new Map(
      calendars.map((calendar) => [calendar.id, calendar.accountId]),
    );

    return { accountIdByCalendarId, accounts: coloredAccounts, colorByAccountId };
  }, [accounts, calendars]);
}

interface ColorEventsOptions {
  accountIdByCalendarId: ReadonlyMap<string, string>;
  colorByAccountId: ReadonlyMap<string, AccountColor>;
  hiddenAccountIds?: readonly string[];
}

/** Stamps each event with its account's colour and drops the events of hidden accounts. */
export function colorEvents(
  events: readonly CalendarEvent[],
  { accountIdByCalendarId, colorByAccountId, hiddenAccountIds = [] }: ColorEventsOptions,
): CalendarEvent[] {
  const hidden = new Set(hiddenAccountIds);
  const colored: CalendarEvent[] = [];

  for (const event of events) {
    const accountId = accountIdByCalendarId.get(event.calendarId);
    if (accountId && hidden.has(accountId)) continue;
    const color = accountId ? colorByAccountId.get(accountId) : undefined;
    colored.push(color ? { ...event, color } : event);
  }

  return colored;
}

export type { ColoredAccount };
