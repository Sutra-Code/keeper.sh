import Circle from "lucide-react/dist/esm/icons/circle";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuItemIcon,
  NavigationMenuItemLabel,
} from "@/components/ui/composites/navigation-menu/navigation-menu-items";
import { msg, useT } from "@/i18n";
import { OnboardingHeading } from "./onboarding-heading";
import { ProviderOptions } from "./provider-options";

const CHECKLIST = [msg("Connect a calendar"), msg("Add where busy time shows"), msg("Start syncing")];

export function WelcomeStep() {
  const t = useT();

  return (
    <>
      <OnboardingHeading
        title={t("Sync your calendars")}
        description={t("SutraCode Calendar copies events between your calendars as busy time, so each one shows when you're free.")}
      />
      <NavigationMenu>
        {CHECKLIST.map((item, index) => (
          <NavigationMenuItem key={item}>
            <NavigationMenuItemIcon>
              <Circle size={15} className={index === 0 ? "text-foreground" : undefined} />
            </NavigationMenuItemIcon>
            <NavigationMenuItemLabel tone={index === 0 ? "default" : "disabled"}>{t(item)}</NavigationMenuItemLabel>
          </NavigationMenuItem>
        ))}
      </NavigationMenu>
      <ProviderOptions step="welcome" />
    </>
  );
}
