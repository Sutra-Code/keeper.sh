import { intlLocale, translate, type Locale } from "@/i18n";

const MINS_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MINS_PER_DAY = MINS_PER_HOUR * HOURS_PER_DAY;

const formatRelative = (diffMins: number, time: string, locale: Locale): string => {
  if (diffMins < 0) return translate(locale, "{time} ago", { time });
  return translate(locale, "in {time}", { time });
};

export const formatTimeUntil = (date: Date, locale: Locale = "en"): string => {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));

  if (diffMins === 0) return translate(locale, "now");

  const absMins = Math.abs(diffMins);

  if (absMins < MINS_PER_HOUR) return formatRelative(diffMins, `${absMins}m`, locale);

  const hours = Math.floor(absMins / MINS_PER_HOUR);
  if (hours < 48) return formatRelative(diffMins, `${hours}h`, locale);

  const days = Math.floor(absMins / MINS_PER_DAY);
  return formatRelative(diffMins, `${days}d`, locale);
};

export const isEventPast = (endTime: Date, nowMs = Date.now()): boolean =>
  endTime.getTime() < nowMs;

const resolvePeriod = (hours: number): string => {
  if (hours >= 12) return "PM";
  return "AM";
};

export const formatClock = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes.toString().padStart(2, "0")}`;
};

export const formatTime = (date: Date): string =>
  `${formatClock(date)} ${resolvePeriod(date.getHours())}`;

// The start's period is dropped when both ends share it, e.g. "9:00 – 10:00 AM".
export const formatTimeRange = (start: Date, end: Date): string => {
  const samePeriod = resolvePeriod(start.getHours()) === resolvePeriod(end.getHours());
  const startLabel = samePeriod ? formatClock(start) : formatTime(start);

  return `${startLabel} – ${formatTime(end)}`;
};

export const formatDate = (date: string | Date, locale: Locale = "en"): string =>
  new Date(date).toLocaleDateString(intlLocale(locale), {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export const formatDateShort = (date: string | Date, locale: Locale = "en"): string =>
  new Date(date).toLocaleDateString(intlLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

export const formatDayHeader = (date: Date, locale: Locale = "en"): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return translate(locale, "Today");
  if (diffDays === 1) return translate(locale, "Tomorrow");
  if (diffDays === -1) return translate(locale, "Yesterday");

  return capitalize(
    date.toLocaleDateString(intlLocale(locale), {
      weekday: "long",
      month: "short",
      day: "numeric",
    }),
  );
};
