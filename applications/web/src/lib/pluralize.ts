import { intlLocale, type Locale } from "@/i18n";

export function pluralize(
  count: number,
  singular: string,
  plural: string = `${singular}s`,
  locale: Locale = "en",
): string {
  if (count === 1) return `${count} ${singular}`;
  return `${count.toLocaleString(intlLocale(locale))} ${plural}`;
}
