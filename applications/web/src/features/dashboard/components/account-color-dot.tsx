import type { AccountColor } from "@keeper.sh/data-schemas";
import { cn } from "@/utils/cn";

export function AccountColorDot({ color, className }: { color: AccountColor; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: `var(--account-${color})` }}
    />
  );
}
