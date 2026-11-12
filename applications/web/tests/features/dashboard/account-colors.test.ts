import { describe, expect, it } from "vitest";
import { colorEvents, resolveAccountColors } from "../../../src/features/dashboard/account-colors";
import type { CalendarEvent } from "../../../src/hooks/use-events";

const event = (id: string, calendarId: string): CalendarEvent => ({
  calendarId,
  calendarName: "Calendar",
  calendarProvider: "google",
  calendarUrl: "",
  description: null,
  endTime: new Date("2026-11-11T11:00:00.000Z"),
  eventStateId: null,
  id,
  isAllDay: false,
  location: null,
  startTime: new Date("2026-11-11T10:00:00.000Z"),
  title: id,
});

describe("resolveAccountColors", () => {
  it("hands out the palette in order to accounts with no chosen colour", () => {
    const colors = resolveAccountColors([
      { color: null, id: "a" },
      { color: null, id: "b" },
      { color: null, id: "c" },
    ]);

    expect([...colors.values()]).toEqual(["blue", "green", "amber"]);
  });

  it("keeps a chosen colour and never gives it to another account automatically", () => {
    const colors = resolveAccountColors([
      { color: null, id: "a" },
      { color: "blue", id: "b" },
      { color: null, id: "c" },
    ]);

    expect(colors.get("b")).toBe("blue");
    expect(colors.get("a")).toBe("green");
    expect(colors.get("c")).toBe("amber");
  });

  it("still colours every account once the palette runs out", () => {
    const accounts = Array.from({ length: 11 }, (_unused, index) => ({ color: null, id: `account-${index}` }));

    const colors = resolveAccountColors(accounts);

    expect(colors.size).toBe(11);
    expect(new Set([...colors.values()].slice(0, 8)).size).toBe(8);
  });
});

describe("colorEvents", () => {
  const options = {
    accountIdByCalendarId: new Map([["cal-work", "work"], ["cal-home", "home"]]),
    colorByAccountId: new Map([["work", "blue"], ["home", "green"]] as const),
  };

  it("stamps each event with its account's colour", () => {
    const colored = colorEvents([event("1", "cal-work"), event("2", "cal-home")], options);

    expect(colored.map(({ color }) => color)).toEqual(["blue", "green"]);
  });

  it("drops the events of a hidden account and keeps the rest", () => {
    const colored = colorEvents(
      [event("1", "cal-work"), event("2", "cal-home")],
      { ...options, hiddenAccountIds: ["work"] },
    );

    expect(colored.map(({ id }) => id)).toEqual(["2"]);
  });

  it("leaves an event uncoloured while its calendar is not known yet", () => {
    const [colored] = colorEvents([event("1", "cal-unknown")], options);

    expect(colored?.color).toBeUndefined();
  });
});
