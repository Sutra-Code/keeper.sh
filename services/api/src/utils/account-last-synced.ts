interface AccountSyncTimes {
  lastReadAt: Date | null;
  lastPushedAt: Date | null;
}

const latest = (first: Date | null, second: Date | null): Date | null => {
  if (!first) {
    return second;
  }
  if (!second) {
    return first;
  }
  if (first.getTime() >= second.getTime()) {
    return first;
  }
  return second;
};

/**
 * Folds an account's last successful read of its calendars and last push to them
 * into the one moment the account last synced in either direction.
 */
const withLastSyncedAt = <Account extends AccountSyncTimes>(
  account: Account,
): Omit<Account, keyof AccountSyncTimes> & { lastSyncedAt: string | null } => {
  const { lastReadAt, lastPushedAt, ...rest } = account;
  return { ...rest, lastSyncedAt: latest(lastReadAt, lastPushedAt)?.toISOString() ?? null };
};

export { withLastSyncedAt };
