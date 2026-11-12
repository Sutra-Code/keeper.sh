import useSWR from "swr";
import TriangleAlert from "lucide-react/dist/esm/icons/triangle-alert";
import {
  NavigationMenu,
  NavigationMenuLinkItem,
  NavigationMenuItemIcon,
  NavigationMenuItemLabel,
  NavigationMenuItemTrailing,
} from "@/components/ui/composites/navigation-menu/navigation-menu-items";
import { ProviderIcon } from "@/components/ui/primitives/provider-icon";
import { Text } from "@/components/ui/primitives/text";
import { useLocale, useT } from "@/i18n";
import { formatTimeUntil } from "@/lib/time";
import type { CalendarAccount } from "@/types/api";
import { resolveAccountColors } from "../account-colors";
import { AccountColorDot } from "./account-color-dot";

const REFRESH_INTERVAL_MS = 60_000;

/** One row per connected account with its colour and when it last synced. */
export function AccountSyncMenu() {
  const t = useT();
  const locale = useLocale();
  const { data: accounts = [] } = useSWR<CalendarAccount[]>("/api/accounts", {
    refreshInterval: REFRESH_INTERVAL_MS,
  });

  if (accounts.length === 0) return null;

  const colors = resolveAccountColors(accounts);

  return (
    <>
      <Text size="sm" tone="muted" className="px-2 pt-1.5">{t("Last sync by account")}</Text>
      <NavigationMenu>
        {accounts.map((account) => {
          const color = colors.get(account.id);
          const attention = account.needsReauthentication;
          return (
            <NavigationMenuLinkItem key={account.id} to={`/dashboard/accounts/${account.id}`}>
              <NavigationMenuItemIcon>
                <ProviderIcon provider={account.provider} />
              </NavigationMenuItemIcon>
              {color && <AccountColorDot color={color} />}
              <NavigationMenuItemLabel className="min-w-0 truncate" tone={attention ? "attention" : undefined}>
                {account.accountLabel}
              </NavigationMenuItemLabel>
              <NavigationMenuItemTrailing
                className="shrink-0 grow-0"
                indicator={
                  attention
                    ? <TriangleAlert size={15} className="shrink-0 text-attention" />
                    : undefined
                }
              >
                <Text size="sm" tone={attention ? "attention" : "muted"} className="whitespace-nowrap tabular-nums">
                  {account.lastSyncedAt
                    ? formatTimeUntil(new Date(account.lastSyncedAt), locale)
                    : t("Not synced yet")}
                </Text>
              </NavigationMenuItemTrailing>
            </NavigationMenuLinkItem>
          );
        })}
      </NavigationMenu>
    </>
  );
}
