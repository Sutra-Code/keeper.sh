import TriangleAlert from "lucide-react/dist/esm/icons/triangle-alert";
import {
  NavigationMenu,
  NavigationMenuLinkItem,
  NavigationMenuItemIcon,
  NavigationMenuItemLabel,
  NavigationMenuItemTrailing,
} from "@/components/ui/composites/navigation-menu/navigation-menu-items";
import { NavigationMenuPopover } from "@/components/ui/composites/navigation-menu/navigation-menu-popover";
import { ProviderIcon } from "@/components/ui/primitives/provider-icon";
import { ProviderIconStack } from "@/components/ui/primitives/provider-icon-stack";
import { useT } from "@/i18n";
import { reauthHref, useReauthAccounts } from "./use-reauth-accounts";

export function DashboardReauthNotice() {
  const t = useT();
  const accounts = useReauthAccounts();

  if (accounts.length === 0) return null;

  return (
    <NavigationMenu variant="attention">
      <NavigationMenuPopover
        trigger={
          <>
            <NavigationMenuItemIcon>
              <TriangleAlert size={15} />
            </NavigationMenuItemIcon>
            <NavigationMenuItemLabel>
              {accounts.length === 1
                ? t("Reconnect {count} account", { count: accounts.length })
                : t("Reconnect {count} accounts", { count: accounts.length })}
            </NavigationMenuItemLabel>
            <NavigationMenuItemTrailing>
              <ProviderIconStack providers={accounts} />
            </NavigationMenuItemTrailing>
          </>
        }
      >
        {accounts.map((account) => (
          <NavigationMenuLinkItem key={account.id} to={reauthHref(account)}>
            <NavigationMenuItemIcon>
              <ProviderIcon provider={account.provider} />
            </NavigationMenuItemIcon>
            <NavigationMenuItemLabel>{account.accountLabel}</NavigationMenuItemLabel>
            <NavigationMenuItemTrailing />
          </NavigationMenuLinkItem>
        ))}
      </NavigationMenuPopover>
    </NavigationMenu>
  );
}
