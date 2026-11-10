import { decryptPassword, encryptPassword } from "@keeper.sh/database";
import { microsoftAppsTable } from "@keeper.sh/database/schema";
import { eq } from "drizzle-orm";
import type { BunSQLDatabase } from "drizzle-orm/bun-sql";
import { setStoredMicrosoftApps } from "./microsoft-apps";
import type { MicrosoftApp } from "./microsoft-apps";

const DEFAULT_RELOAD_INTERVAL_MS = 60_000;
const DEFAULT_TENANT = "common";

interface MicrosoftAppStoreOptions {
  database: BunSQLDatabase;
  encryptionKey: string | undefined;
}

interface MicrosoftAppInput {
  key: string;
  label: string;
  tenantId?: string | null;
  clientId: string;
  /** Left out on an edit to keep the stored secret. */
  clientSecret?: string | null;
}

/** Reads the saved apps into this process's registry; a row that cannot be decrypted is skipped. */
const reloadStoredMicrosoftApps = async ({ database, encryptionKey }: MicrosoftAppStoreOptions): Promise<MicrosoftApp[]> => {
  if (!encryptionKey) {
    setStoredMicrosoftApps([]);
    return [];
  }
  const rows = await database.select().from(microsoftAppsTable).orderBy(microsoftAppsTable.key);
  const apps: MicrosoftApp[] = [];
  for (const row of rows) {
    try {
      apps.push({
        clientId: row.clientId,
        clientSecret: decryptPassword(row.encryptedClientSecret, encryptionKey),
        key: row.key,
        label: row.label,
        tenantId: row.tenantId,
      });
    } catch {
      // A secret encrypted with another key: the app stays unavailable until it is saved again.
    }
  }
  setStoredMicrosoftApps(apps);
  return apps;
};

/**
 * Loads the saved apps now and keeps reloading them, so an app added in settings reaches the
 * worker and cron without a restart. A missing table (migrations not run yet) is retried later.
 */
const startMicrosoftAppSync = async (
  options: MicrosoftAppStoreOptions,
  intervalMs: number = DEFAULT_RELOAD_INTERVAL_MS,
): Promise<void> => {
  const reload = () => reloadStoredMicrosoftApps(options).catch(() => null);
  await reload();
  const timer = setInterval(reload, intervalMs);
  timer.unref?.();
};

const saveMicrosoftApp = async (
  options: MicrosoftAppStoreOptions,
  input: MicrosoftAppInput,
): Promise<void> => {
  const { database, encryptionKey } = options;
  if (!encryptionKey) {
    throw new Error("ENCRYPTION_KEY is required to store Microsoft apps");
  }
  const tenantId = input.tenantId?.trim() || DEFAULT_TENANT;
  const values = { clientId: input.clientId.trim(), label: input.label.trim(), tenantId };

  if (input.clientSecret) {
    const encryptedClientSecret = encryptPassword(input.clientSecret.trim(), encryptionKey);
    await database
      .insert(microsoftAppsTable)
      .values({ ...values, encryptedClientSecret, key: input.key })
      .onConflictDoUpdate({ set: { ...values, encryptedClientSecret }, target: microsoftAppsTable.key });
  } else {
    const updated = await database
      .update(microsoftAppsTable)
      .set(values)
      .where(eq(microsoftAppsTable.key, input.key))
      .returning({ key: microsoftAppsTable.key });
    if (updated.length === 0) {
      throw new Error("A new Microsoft app needs its client secret");
    }
  }
  await reloadStoredMicrosoftApps(options);
};

const deleteMicrosoftApp = async (options: MicrosoftAppStoreOptions, key: string): Promise<void> => {
  await options.database.delete(microsoftAppsTable).where(eq(microsoftAppsTable.key, key));
  await reloadStoredMicrosoftApps(options);
};

interface StoredMicrosoftAppSummary {
  key: string;
  label: string;
  tenantId: string;
  clientId: string;
  updatedAt: Date;
}

/** Saved apps without their secrets, for the settings screen. */
const listStoredMicrosoftApps = (database: BunSQLDatabase): Promise<StoredMicrosoftAppSummary[]> =>
  database
    .select({
      clientId: microsoftAppsTable.clientId,
      key: microsoftAppsTable.key,
      label: microsoftAppsTable.label,
      tenantId: microsoftAppsTable.tenantId,
      updatedAt: microsoftAppsTable.updatedAt,
    })
    .from(microsoftAppsTable)
    .orderBy(microsoftAppsTable.key);

export {
  deleteMicrosoftApp,
  listStoredMicrosoftApps,
  reloadStoredMicrosoftApps,
  saveMicrosoftApp,
  startMicrosoftAppSync,
};
export type { MicrosoftAppInput, MicrosoftAppStoreOptions, StoredMicrosoftAppSummary };
