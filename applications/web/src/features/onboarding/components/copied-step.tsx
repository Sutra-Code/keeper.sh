import { useSetAtom } from "jotai";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";
import Check from "lucide-react/dist/esm/icons/check";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import {
  NavigationMenu,
  NavigationMenuItemIcon,
  NavigationMenuItemLabel,
  NavigationMenuItemTrailing,
  NavigationMenuLinkItem,
} from "@/components/ui/composites/navigation-menu/navigation-menu-items";
import { Button, ButtonText, ExternalLinkButton } from "@/components/ui/primitives/button";
import { providerCalendarApp } from "@/lib/providers";
import { onboardingRunAtom } from "@/state/onboarding";
import { getCalendarProvider } from "@/utils/calendars";
import type { CalendarSource } from "@/types/api";
import { useT, type Translate } from "@/i18n";
import type { SyncProposal } from "../sync-proposal";
import type { CopiedEvents } from "../use-copied-events";
import { OnboardingHeading } from "./onboarding-heading";
import { CopiedEventRows } from "./copied-event-rows";

const COPIED_PREVIEW_COUNT = 3;

const describeOutcome = (
  { origin, destination, forward, backward }: SyncProposal<CalendarSource>,
  t: Translate,
): string => {
  if (forward && backward) {
    return t("{first} and {second} now show you as busy at the same times.", {
      first: origin.name,
      second: destination.name,
    });
  }
  if (forward) {
    return t("{shown} now shows you as busy when {source} has an event.", {
      shown: destination.name,
      source: origin.name,
    });
  }
  return t("{shown} now shows you as busy when {source} has an event.", {
    shown: origin.name,
    source: destination.name,
  });
};

interface CopiedStepProps {
  copies: CopiedEvents;
  calendars: CalendarSource[];
  proposal: SyncProposal<CalendarSource> | null;
}

export function CopiedStep({ copies, calendars, proposal }: CopiedStepProps) {
  const t = useT();
  const setRun = useSetAtom(onboardingRunAtom);
  const destination = proposal?.forward ? proposal.destination : proposal?.origin;
  const calendarApp = destination ? providerCalendarApp(getCalendarProvider(destination)) : null;

  return (
    <>
      <OnboardingHeading
        icon={{ glyph: <Check size={22} strokeWidth={1.75} />, tone: "success" }}
        title={copies.count === 1
          ? t("1 event copied")
          : t("{count} events copied", { count: copies.count.toLocaleString() })}
        description={proposal ? describeOutcome(proposal, t) : t("Your calendars now show you as busy at the same times.")}
      />
      <NavigationMenu>
        <CopiedEventRows
          events={copies.upcoming.slice(0, COPIED_PREVIEW_COUNT)}
          calendars={calendars}
          showsCheck={false}
        />
        <NavigationMenuLinkItem to="/dashboard/events">
          <NavigationMenuItemIcon>
            <CalendarDays size={15} />
          </NavigationMenuItemIcon>
          <NavigationMenuItemLabel>{t("View all events")}</NavigationMenuItemLabel>
          <NavigationMenuItemTrailing />
        </NavigationMenuLinkItem>
      </NavigationMenu>
      <Button className="w-full justify-center" onClick={() => setRun({ phase: "finished" })}>
        <ButtonText>{t("Go to home")}</ButtonText>
      </Button>
      {calendarApp && (
        <ExternalLinkButton
          href={calendarApp.url}
          target="_blank"
          rel="noreferrer"
          variant="border"
          className="w-full justify-center"
        >
          <ExternalLink size={15} />
          <ButtonText>{t(calendarApp.label)}</ButtonText>
        </ExternalLinkButton>
      )}
    </>
  );
}
