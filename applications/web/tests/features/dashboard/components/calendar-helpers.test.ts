import { describe, expect, it } from "vitest";
import {
  addDays,
  formatHourLabel,
  formatMonthTitle,
  formatWeekTitle,
  formatWeekdayShort,
  getMonthFetchRange,
  getMonthGridDays,
  getWeekdayLabels,
  getWeekFetchRange,
  startOfVisibleWeek,
  WEEK_STARTS_ON,
  WEEK_VIEW_DAYS,
} from "../../../../src/features/dashboard/components/calendar-helpers";

const MS_PER_DAY = 86_400_000;

const visibleDays = (anchor: Date): Date[] =>
  Array.from({ length: WEEK_VIEW_DAYS }, (_, index) => addDays(startOfVisibleWeek(anchor), index));

const contains = (range: { start: Date; end: Date }, day: Date): boolean =>
  day.getTime() >= range.start.getTime() && day.getTime() < range.end.getTime();

describe("getWeekFetchRange", () => {
  it("starts at midnight on the first weekday and spans four weeks", () => {
    const { start, end } = getWeekFetchRange(new Date(2026, 7, 22, 15, 30));

    expect(start.getDay()).toBe(WEEK_STARTS_ON);
    expect([start.getHours(), start.getMinutes()]).toEqual([0, 0]);
    expect(Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)).toBe(28);
  });

  it("covers the visible week, and the weeks a step or a page away, on every day", () => {
    // Two years of anchors cover daylight-saving changes and a year boundary.
    const last = new Date(2027, 11, 31);
    const uncovered: string[] = [];
    for (let anchor = new Date(2026, 0, 1); anchor <= last; anchor = addDays(anchor, 1)) {
      const range = getWeekFetchRange(anchor);
      for (const offset of [0, 1, -1, WEEK_VIEW_DAYS, -WEEK_VIEW_DAYS]) {
        for (const day of visibleDays(addDays(anchor, offset))) {
          if (!contains(range, day)) uncovered.push(`${anchor.toDateString()} ${offset}`);
        }
      }
    }

    expect(uncovered).toEqual([]);
  });
});

describe("getMonthFetchRange", () => {
  it("spans exactly the month grid's 42 days", () => {
    const anchor = new Date(2026, 7, 22);
    const days = getMonthGridDays(anchor);
    const { start, end } = getMonthFetchRange(anchor);

    expect(start.getTime()).toBe(days[0].getTime());
    expect(end.getTime()).toBe(addDays(days[41], 1).getTime());
    expect(Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)).toBe(42);
  });
});

describe("date labels", () => {
  it("names weekdays in the active language, short and capitalised", () => {
    expect(getWeekdayLabels("en")).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    expect(getWeekdayLabels("es")).toEqual(["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]);
    expect(formatWeekdayShort(new Date(2026, 7, 19), "es")).toBe("Mié");
  });

  it("titles a month in the active language", () => {
    expect(formatMonthTitle(new Date(2026, 7, 22), "en")).toBe("August 2026");
    expect(formatMonthTitle(new Date(2026, 7, 22), "es")).toBe("Agosto de 2026");
  });

  it("titles a week within one month", () => {
    expect(formatWeekTitle(new Date(2026, 7, 22), "en")).toBe("Aug 19 – 25, 2026");
    expect(formatWeekTitle(new Date(2026, 7, 22), "es")).toBe("19 – 25 ago 2026");
  });

  it("titles a week that crosses a month or a year", () => {
    expect(formatWeekTitle(new Date(2026, 9, 31), "en")).toBe("Oct 28 – Nov 3, 2026");
    expect(formatWeekTitle(new Date(2026, 9, 31), "es")).toBe("28 oct – 3 nov 2026");
    expect(formatWeekTitle(new Date(2026, 11, 31), "en")).toBe("Dec 28, 2026 – Jan 3, 2027");
    expect(formatWeekTitle(new Date(2026, 11, 31), "es")).toBe("28 dic 2026 – 3 ene 2027");
  });

  it("labels hours on a compact twelve-hour clock in both languages", () => {
    expect([1, 12, 13, 23].map((hour) => formatHourLabel(hour, "en"))).toEqual(["1am", "12pm", "1pm", "11pm"]);
    expect([1, 12, 13, 23].map((hour) => formatHourLabel(hour, "es"))).toEqual(["1am", "12pm", "1pm", "11pm"]);
  });
});
