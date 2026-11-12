import { useState } from "react";
import { useSetAtom } from "jotai";
import Link2 from "lucide-react/dist/esm/icons/link-2";
import Copy from "lucide-react/dist/esm/icons/copy";
import Check from "lucide-react/dist/esm/icons/check";
import {
  NavigationMenu,
  NavigationMenuButtonItem,
  NavigationMenuItem,
  NavigationMenuItemIcon,
  NavigationMenuItemLabel,
  NavigationMenuItemTrailing,
} from "@/components/ui/composites/navigation-menu/navigation-menu-items";
import { ProviderIcon } from "@/components/ui/primitives/provider-icon";
import { useIcalFeeds } from "@/hooks/use-ical-feeds";
import { track, ANALYTICS_EVENTS } from "@/lib/analytics";
import { chosenDestinationIdAtom } from "@/state/onboarding";
import { showToastAtom } from "@/state/toast";
import { getCalendarProvider } from "@/utils/calendars";
import type { CalendarSource } from "@/types/api";
import { useT } from "@/i18n";
import { OnboardingHeading } from "./onboarding-heading";
import { ProviderOptions } from "./provider-options";

interface AddDestinationStepProps {
  origin: CalendarSource;
  sameAccountDestinations: CalendarSource[];
}

export function AddDestinationStep({ origin, sameAccountDestinations }: AddDestinationStepProps) {
  const t = useT();
  const chooseDestination = useSetAtom(chosenDestinationIdAtom);

  const chooseSameAccount = (calendar: CalendarSource) => {
    track(ANALYTICS_EVENTS.onboarding_destination_chosen, { destination_path: "same_account" });
    chooseDestination(calendar.id);
  };

  return (
    <>
      <OnboardingHeading
        title={t("Where should your busy time show?")}
        description={t("SutraCode Calendar copies events from {calendar} into a second calendar. Connect the one that should show you as busy.", {
          calendar: origin.name,
        })}
      />
      <NavigationMenu>
        <NavigationMenuItem>
          <NavigationMenuItemIcon>
            <ProviderIcon provider={getCalendarProvider(origin)} calendarType={origin.calendarType} />
          </NavigationMenuItemIcon>
          <NavigationMenuItemLabel tone="default">{origin.name}</NavigationMenuItemLabel>
        </NavigationMenuItem>
      </NavigationMenu>
      {sameAccountDestinations.length > 0 && (
        <NavigationMenu>
          {sameAccountDestinations.map((calendar) => (
            <NavigationMenuButtonItem key={calendar.id} onClick={() => chooseSameAccount(calendar)}>
              <NavigationMenuItemIcon>
                <ProviderIcon provider={getCalendarProvider(calendar)} calendarType={calendar.calendarType} />
              </NavigationMenuItemIcon>
              <NavigationMenuItemLabel>{calendar.name}</NavigationMenuItemLabel>
              <NavigationMenuItemTrailing />
            </NavigationMenuButtonItem>
          ))}
        </NavigationMenu>
      )}
      <ProviderOptions step="add-destination" />
      <SubscribeLinkOption />
    </>
  );
}

function SubscribeLinkOption() {
  const t = useT();
  const { data: feeds } = useIcalFeeds();
  const showToast = useSetAtom(showToastAtom);
  const [copied, setCopied] = useState(false);
  const feed = feeds?.find(({ isDefault }) => isDefault) ?? feeds?.[0];

  const copyLink = async () => {
    if (!feed) return;
    await navigator.clipboard.writeText(feed.icalUrl);
    track(ANALYTICS_EVENTS.onboarding_destination_chosen, { destination_path: "ical_link" });
    track(ANALYTICS_EVENTS.ical_link_copied);
    setCopied(true);
    showToast(t("Link copied"));
  };

  return (
    <NavigationMenu>
      <NavigationMenuButtonItem onClick={feed ? copyLink : undefined} disabled={!feed}>
        <NavigationMenuItemIcon>
          <Link2 size={15} />
        </NavigationMenuItemIcon>
        <NavigationMenuItemLabel>{t("Subscribe with a link instead")}</NavigationMenuItemLabel>
        <NavigationMenuItemTrailing indicator={copied ? <Check size={15} className="shrink-0" /> : <Copy size={15} className="shrink-0" />} />
      </NavigationMenuButtonItem>
    </NavigationMenu>
  );
}
