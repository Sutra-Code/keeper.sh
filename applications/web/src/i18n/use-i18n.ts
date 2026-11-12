import { use, useCallback } from "react";
import { I18nContext } from "./i18n-context";
import type { Locale } from "./locale";
import { translate, type Translate } from "./translate";

export function useLocale(): Locale {
  return use(I18nContext).locale;
}

export function useSetLocale(): (locale: Locale) => void {
  return use(I18nContext).setLocale;
}

/** Returns `t`, which translates an English source string into the active language. */
export function useT(): Translate {
  const { locale } = use(I18nContext);
  return useCallback<Translate>((text, values) => translate(locale, text, values), [locale]);
}
