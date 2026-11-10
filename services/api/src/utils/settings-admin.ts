import { user as userTable } from "@keeper.sh/database/auth-schema";
import { eq } from "drizzle-orm";
import { database, env } from "@/context";

const parseAdminUsernames = (value: string | undefined): Set<string> =>
  new Set(
    (value ?? "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter((name) => name.length > 0),
  );

/** Only the usernames in SETTINGS_ADMIN_USERNAMES manage server-wide settings; nobody when unset. */
const isSettingsAdmin = async (userId: string): Promise<boolean> => {
  const admins = parseAdminUsernames(env.SETTINGS_ADMIN_USERNAMES);
  if (admins.size === 0) {
    return false;
  }
  const [row] = await database
    .select({ username: userTable.username })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  return Boolean(row?.username && admins.has(row.username.toLowerCase()));
};

export { isSettingsAdmin, parseAdminUsernames };
