export const LOCALES = ["es", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** The language shown when the visitor has not picked one. */
export const DEFAULT_LOCALE: Locale = "es";

/** The language the source strings are written in, and the one used outside a provider. */
export const SOURCE_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "keeper.locale";

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

const INTL_LOCALES: Record<Locale, string> = {
  en: "en-US",
  es: "es",
};

/** The BCP 47 tag to hand to `Intl` and `toLocale*String` for a locale. */
export function intlLocale(locale: Locale): string {
  return INTL_LOCALES[locale];
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.some((locale) => locale === value);
}

export function readLocaleCookie(cookieHeader?: string | null): Locale {
  const cookieSource = cookieHeader
    ?? (typeof document === "undefined" ? "" : document.cookie);

  for (const cookie of cookieSource.split(";")) {
    const [name, value] = cookie.trim().split("=");
    if (name === LOCALE_COOKIE && isLocale(value)) return value;
  }

  return DEFAULT_LOCALE;
}

export function writeLocaleCookie(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}
