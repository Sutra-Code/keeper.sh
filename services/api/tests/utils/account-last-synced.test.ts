import { describe, expect, it } from "vitest";
import { withLastSyncedAt } from "../../src/utils/account-last-synced";

describe("withLastSyncedAt", () => {
  it("reports the later of the last read and the last push", () => {
    const account = withLastSyncedAt({
      id: "account-1",
      lastPushedAt: new Date("2026-11-11T10:05:00.000Z"),
      lastReadAt: new Date("2026-11-11T10:00:00.000Z"),
    });

    expect(account).toEqual({ id: "account-1", lastSyncedAt: "2026-11-11T10:05:00.000Z" });
  });

  it("uses whichever direction has synced when the other never has", () => {
    const account = withLastSyncedAt({
      lastPushedAt: null,
      lastReadAt: new Date("2026-11-11T10:00:00.000Z"),
    });

    expect(account.lastSyncedAt).toBe("2026-11-11T10:00:00.000Z");
  });

  it("reports null for an account that has never synced", () => {
    expect(withLastSyncedAt({ lastPushedAt: null, lastReadAt: null }).lastSyncedAt).toBeNull();
  });
});
