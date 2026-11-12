import type { ReactNode } from "react";
import { es } from "./es";
import { SOURCE_LOCALE, type Locale } from "./locale";

export type TranslationValues = Record<string, string | number>;

export type Translate = (text: string, values?: TranslationValues) => string;

type Dictionary = Readonly<Record<string, string>>;

const DICTIONARIES: Partial<Record<Locale, Dictionary>> = { es };

const PLACEHOLDER = /\{(\w+)\}/g;

function interpolate(text: string, values: TranslationValues | undefined): string {
  if (!values) return text;
  return text.replace(PLACEHOLDER, (match, name: string) => {
    if (!(name in values)) return match;
    return String(values[name]);
  });
}

/**
 * Translates an English source string. The English text is the key, so a string
 * with no entry in the dictionary is shown in English rather than as a key.
 */
export function translate(locale: Locale, text: string, values?: TranslationValues): string {
  if (locale === SOURCE_LOCALE) return interpolate(text, values);
  const translated = DICTIONARIES[locale]?.[text] ?? text;
  return interpolate(translated, values);
}

/**
 * Marks an English string as translatable where no translator is in reach, such
 * as a module constant. It returns the text unchanged; pass it to `t` on render.
 */
export function msg(text: string): string {
  return text;
}

const RICH_TAG = /<(\w+)>(.*?)<\/\1>/gs;

export type RichRenderers = Record<string, (chunk: string) => ReactNode>;

/**
 * Splits an already translated string on `<name>…</name>` tags and renders each
 * tagged chunk with the renderer of the same name, so a sentence with a link or
 * emphasis in the middle stays one translatable string.
 */
export function rich(text: string, renderers: RichRenderers): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(RICH_TAG)) {
    const [whole, name, chunk] = match;
    const start = match.index;
    if (start > cursor) nodes.push(text.slice(cursor, start));
    const render = renderers[name];
    nodes.push(render ? render(chunk) : chunk);
    cursor = start + whole.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}
