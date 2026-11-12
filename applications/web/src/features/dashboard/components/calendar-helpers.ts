import { intlLocale, type Locale } from "@/i18n";

/** 0 = Sunday, as `Date#getDay`. */
export const WEEK_STARTS_ON = 0;

const GRID_CELLS = 42;

export const WEEK_VIEW_DAYS = 7;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** First day of the week view's rolling range centred on `anchor`. */
export function startOfVisibleWeek(anchor: Date): Date {
  return addDays(anchor, -Math.floor(WEEK_VIEW_DAYS / 2));
}

export function startOfWeek(date: Date): Date {
  const offset = (date.getDay() - WEEK_STARTS_ON + 7) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getMonthGridDays(anchor: Date): Date[] {
  const monthStart = startOfMonth(anchor);
  const leadingDays = (monthStart.getDay() - WEEK_STARTS_ON + 7) % 7;
  const gridStart = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    monthStart.getDate() - leadingDays,
  );
  return Array.from({ length: GRID_CELLS }, (_, index) => {
    return new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
  });
}

/** Sentence-cases a formatted date: Spanish names come back lower-case ("lun", "noviembre"). */
export function capitalizeFirst(text: string, locale: Locale): string {
  return text.charAt(0).toLocaleUpperCase(intlLocale(locale)) + text.slice(1);
}

// Some ICU versions abbreviate with a trailing period ("lun.", "ago."); dropped so server and browser agree.
const formatShortName = (
  date: Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
): string => date.toLocaleDateString(intlLocale(locale), options).replace(".", "");

export function formatWeekdayShort(day: Date, locale: Locale): string {
  return capitalizeFirst(formatShortName(day, locale, { weekday: "short" }), locale);
}

export function getWeekdayLabels(locale: Locale): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    // 2023-01-01 is a Sunday, so it anchors the label sequence.
    const day = new Date(2023, 0, 1 + WEEK_STARTS_ON + index);
    return formatWeekdayShort(day, locale);
  });
}

export function formatMonthTitle(anchor: Date, locale: Locale): string {
  return capitalizeFirst(
    anchor.toLocaleDateString(intlLocale(locale), { month: "long", year: "numeric" }),
    locale,
  );
}

// Composed by hand: Intl has no day+year-without-month format ("Aug 19 – 25, 2026", "19 – 25 ago 2026").
export function formatWeekTitle(anchor: Date, locale: Locale): string {
  const start = startOfVisibleWeek(anchor);
  const end = addDays(start, WEEK_VIEW_DAYS - 1);
  const startMonth = formatShortName(start, locale, { month: "short" });
  const endMonth = formatShortName(end, locale, { month: "short" });

  if (locale === "es") {
    if (isSameMonth(start, end)) {
      return `${start.getDate()} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
    }
    if (start.getFullYear() === end.getFullYear()) {
      return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
    }
    return `${start.getDate()} ${startMonth} ${start.getFullYear()} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
  }

  if (isSameMonth(start, end)) {
    return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${startMonth} ${start.getDate()}, ${start.getFullYear()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
}

const FETCH_WEEKS_BEFORE = 1;
const FETCH_WEEKS = 4;

/** Half-open `[start, end)` quantised to calendar weeks, so a ±7-day page stays inside the previous window while the next loads. */
export function getWeekFetchRange(anchor: Date): { start: Date; end: Date } {
  const start = addDays(startOfWeek(startOfVisibleWeek(anchor)), -FETCH_WEEKS_BEFORE * 7);
  return { start, end: addDays(start, FETCH_WEEKS * 7) };
}

/** Half-open `[start, end)` covering exactly the 6×7 grid's days. */
export function getMonthFetchRange(anchor: Date): { start: Date; end: Date } {
  const days = getMonthGridDays(anchor);
  return { start: days[0], end: addDays(days[days.length - 1], 1) };
}

export const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export const HOUR_HEIGHT = 48;

// Twelve-hour in every language, like the event times; the day period is squeezed to "am"/"pm" to fit the gutter.
export function formatHourLabel(hour: number, locale: Locale): string {
  const parts = new Intl.DateTimeFormat(intlLocale(locale), { hour: "numeric", hour12: true })
    .formatToParts(new Date(2023, 0, 1, hour));
  const value = parts.find((part) => part.type === "hour")?.value ?? String(hour % 12 || 12);
  const period = parts.find((part) => part.type === "dayPeriod")?.value ?? "";

  return `${value}${period.replace(/[\s.]/g, "").toLowerCase()}`;
}
