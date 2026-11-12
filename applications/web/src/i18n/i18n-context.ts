import { createContext } from "react";
import { SOURCE_LOCALE, type Locale } from "./locale";

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

// Outside a provider (isolated component tests) text stays in the source language.
export const I18nContext = createContext<I18nContextValue>({
  locale: SOURCE_LOCALE,
  setLocale: () => {},
});
