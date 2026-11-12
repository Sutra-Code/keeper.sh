import { cn } from "@/utils/cn";
import { useLocale, useSetLocale, useT } from "./use-i18n";
import { LOCALES, LOCALE_LABELS } from "./locale";

/** Two-way language choice. The pick is kept in a cookie so the server renders it too. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useT();
  const locale = useLocale();
  const setLocale = useSetLocale();

  return (
    <div role="group" aria-label={t("Language")} className={cn("flex items-center gap-1", className)}>
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={option === locale}
          onClick={() => setLocale(option)}
          className={cn(
            "cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium tracking-tight transition-colors",
            option === locale
              ? "bg-foreground text-background"
              : "text-foreground-muted hover:text-foreground",
          )}
        >
          {LOCALE_LABELS[option]}
        </button>
      ))}
    </div>
  );
}
