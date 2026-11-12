import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { es } from "../../src/i18n/es";
import { rich, translate } from "../../src/i18n/translate";

const SOURCE_ROOT = resolve(import.meta.dirname, "../../src");

// Marketing pages are served in English only.
const SKIPPED = [/\/features\/marketing\//, /\/routes\/\(marketing\)\//, /\/i18n\/es\//, /\/generated\//];

const collectSourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return collectSourceFiles(path);
    if (!/\.tsx?$/.test(path)) return [];
    if (SKIPPED.some((pattern) => pattern.test(path))) return [];
    return [path];
  });

// A literal first argument to t(), msg() or translate(locale, …).
const CALL = /\b(?:t|msg)\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\$]|\\.)*`)/g;

const readLiteral = (literal: string): string => {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1);
  return body.replace(/\\(.)/gs, (_match, escaped: string) => {
    if (escaped === "n") return "\n";
    return escaped;
  });
};

const collectSourceStrings = (): Map<string, string> => {
  const found = new Map<string, string>();
  for (const file of collectSourceFiles(SOURCE_ROOT)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(CALL)) {
      found.set(readLiteral(match[1]), file.slice(SOURCE_ROOT.length + 1));
    }
  }
  return found;
};

const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

const tags = (text: string): string[] =>
  [...text.matchAll(/<(\w+)>/g)].map((match) => match[1]).sort();

describe("spanish dictionary", () => {
  it("translates every string the interface marks as translatable", () => {
    const missing = [...collectSourceStrings()]
      .filter(([text]) => !(text in es))
      .map(([text, file]) => `${file}: ${text}`);

    expect(missing).toEqual([]);
  });

  it("keeps the placeholders and tags of each source string", () => {
    const mismatched = Object.entries(es).filter(
      ([source, translated]) =>
        placeholders(source).join() !== placeholders(translated).join()
        || tags(source).join() !== tags(translated).join(),
    );

    expect(mismatched.map(([source]) => source)).toEqual([]);
  });

  it("leaves no empty translation", () => {
    const empty = Object.entries(es).filter(([, translated]) => translated.trim().length === 0);
    expect(empty.map(([source]) => source)).toEqual([]);
  });
});

describe("translate", () => {
  it("returns the source string in English", () => {
    expect(translate("en", "Go home")).toBe("Go home");
  });

  it("translates a known string into Spanish", () => {
    expect(translate("es", "Go home")).toBe("Ir al inicio");
  });

  it("falls back to English for a string with no translation", () => {
    expect(translate("es", "A string nobody translated")).toBe("A string nobody translated");
  });

  it("fills placeholders in either language", () => {
    expect(translate("en", "{count} calendars", { count: 3 })).toBe("3 calendars");
  });

  it("renders tagged chunks with their renderer", () => {
    expect(rich("Read the <link>guide</link> first.", { link: (chunk) => `[${chunk}]` }))
      .toEqual(["Read the ", "[guide]", " first."]);
  });
});
