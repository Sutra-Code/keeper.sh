import { useCallback, useMemo, useState, type ReactNode } from "react";
import { I18nContext } from "./i18n-context";
import { writeLocaleCookie, type Locale } from "./locale";

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    writeLocaleCookie(next);
    document.documentElement.lang = next;
    setLocaleState(next);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <I18nContext value={value}>{children}</I18nContext>;
}
