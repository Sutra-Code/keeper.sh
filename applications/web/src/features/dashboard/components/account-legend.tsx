import { useAtom } from "jotai";
import { cn } from "@/utils/cn";
import { useT } from "@/i18n";
import { hiddenAccountIdsAtom } from "@/state/hidden-accounts";
import type { ColoredAccount } from "../account-colors";
import { AccountColorDot } from "./account-color-dot";

/** One chip per connected account; pressing a chip hides or shows that account's events. */
export function AccountLegend({ accounts }: { accounts: ColoredAccount[] }) {
  const t = useT();
  const [hiddenIds, setHiddenIds] = useAtom(hiddenAccountIdsAtom);

  if (accounts.length === 0) return null;

  const toggle = (accountId: string) => {
    setHiddenIds((current) =>
      current.includes(accountId)
        ? current.filter((id) => id !== accountId)
        : [...current, accountId],
    );
  };

  return (
    <div
      role="group"
      aria-label={t("Accounts shown in the calendar")}
      className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1"
    >
      {accounts.map((account) => {
        const hidden = hiddenIds.includes(account.id);
        return (
          <button
            key={account.id}
            type="button"
            aria-pressed={!hidden}
            title={hidden ? t("Show this account's events") : t("Hide this account's events")}
            onClick={() => toggle(account.id)}
            className={cn(
              "flex max-w-48 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs font-medium tracking-tight text-foreground transition-opacity hover:bg-background-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              hidden && "opacity-45 line-through",
            )}
          >
            <AccountColorDot color={account.color} />
            <span className="truncate">{account.label}</span>
          </button>
        );
      })}
    </div>
  );
}
