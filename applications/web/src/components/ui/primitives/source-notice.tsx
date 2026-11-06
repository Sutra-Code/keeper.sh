import { cn } from "@/utils/cn";

export const SOURCE_CODE_URL = "https://github.com/Sutra-Code/keeper.sh/tree/sutracode-design";

/** AGPL-3.0, sección 13: quien usa la app por red debe poder obtener el código de esta versión. */
export function SourceNotice({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs tracking-tight text-foreground-muted", className)}>
      Based on Keeper.sh ·{" "}
      <a
        href={SOURCE_CODE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        Source code
      </a>{" "}
      (AGPL-3.0)
    </p>
  );
}
