import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { ReactNode, SubmitEvent } from "react";
import ArrowLeftRight from "lucide-react/dist/esm/icons/arrow-left-right";
import Check from "lucide-react/dist/esm/icons/check";
import Eye from "lucide-react/dist/esm/icons/eye";
import EyeOff from "lucide-react/dist/esm/icons/eye-off";
import CalendarPlus from "lucide-react/dist/esm/icons/calendar-plus";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import SutraMark from "@/assets/sutra-mark.svg?react";
import { BackButton } from "@/components/ui/primitives/back-button";
import { Heading2 } from "@/components/ui/primitives/heading";
import { Text } from "@/components/ui/primitives/text";
import { Divider } from "@/components/ui/primitives/divider";
import { Button, ButtonText } from "@/components/ui/primitives/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuItemIcon,
  NavigationMenuItemLabel,
} from "@/components/ui/composites/navigation-menu/navigation-menu-items";
import { track, ANALYTICS_EVENTS } from "@/lib/analytics";
import { providerIcons } from "@/lib/providers";
import { useMicrosoftApps } from "@/hooks/use-microsoft-apps";
import type { MicrosoftApp } from "@/hooks/use-microsoft-apps";
import { msg, rich, useT } from "@/i18n";

type Provider = "google" | "outlook";

interface ProviderPreamble {
  label: string;
  heading: string;
  company: string;
  accountNotice?: string;
}

const PROVIDER_PREAMBLES: Record<Provider, ProviderPreamble> = {
  google: { company: "Google", heading: "Google Calendar", label: "Google" },
  outlook: {
    accountNotice: msg("A work or school account may need your admin to approve SutraCode Calendar first."),
    company: "Microsoft",
    heading: msg("Outlook or Microsoft 365"),
    label: "Outlook",
  },
};

const ACCESS_USES = [
  { icon: Eye, label: msg("Reads when your events happen") },
  { icon: CalendarPlus, label: msg("Adds busy blocks to calendars you pick") },
  { icon: ShieldCheck, label: msg("Never edits or deletes your events") },
  { icon: EyeOff, label: msg("Titles and guests stay private") },
];


export function PermissionsList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item} className="flex flex-row-reverse justify-between items-center gap-2">
          <Check className="shrink-0 text-foreground-muted" size={16} />
          <Text size="sm" tone="muted" align="left">{item}</Text>
        </li>
      ))}
    </ul>
  );
}

interface PreambleLayoutProps {
  provider: Provider;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  /** Rendered just above the continue button, inside the form. */
  picker?: ReactNode;
  submitDisabled?: boolean;
  children?: ReactNode;
}

function PreambleLayout({ provider, onSubmit, picker, submitDisabled = false, children }: PreambleLayoutProps) {
  const { label, heading, company, accountNotice } = PROVIDER_PREAMBLES[provider];
  const t = useT();
  return (
    <>
      <ProviderIconPair>
        <img
          src={providerIcons[provider]}
          alt={label}
          width={40}
          height={40}
          className="size-full rounded-lg p-3"
        />
      </ProviderIconPair>
      <div className="flex flex-col gap-1">
        <Heading2 as="h1">{t("Connect {provider}", { provider: t(heading) })}</Heading2>
        <Text size="sm" tone="muted" align="left">
          {t("{company} will ask for access to your calendars. This is what SutraCode Calendar does with it.", { company })}
        </Text>
      </div>
      <NavigationMenu>
        {ACCESS_USES.map(({ icon: Icon, label: use }) => (
          <NavigationMenuItem key={use}>
            <NavigationMenuItemIcon>
              <Icon size={15} />
            </NavigationMenuItemIcon>
            <NavigationMenuItemLabel>{t(use)}</NavigationMenuItemLabel>
          </NavigationMenuItem>
        ))}
      </NavigationMenu>
      {accountNotice && (
        <Text size="sm" tone="muted" align="left">{t(accountNotice)}</Text>
      )}
      <Divider />
      <form onSubmit={onSubmit} className="contents">
        {picker}
        <div className="flex items-stretch gap-2">
          <BackButton variant="border" size="standard" className="self-stretch justify-center px-3.5" />
          <Button type="submit" disabled={submitDisabled} className="grow justify-center">
            <ButtonText>{t("Continue to {company}", { company })}</ButtonText>
          </Button>
        </div>
      </form>
      {children}
    </>
  );
}

interface LinkOAuthPreambleProps {
  provider: Provider;
}

interface MicrosoftAppPickerProps {
  apps: MicrosoftApp[];
  selected: string;
  onSelect: (key: string) => void;
}

function NoMicrosoftApps() {
  const t = useT();
  return (
    <Text size="sm" tone="muted" align="left">
      {rich(t("No organization is set up yet. Add one in <link>Settings → Microsoft Apps</link> first."), {
        link: (chunk) => (
          <Link key="link" to="/dashboard/settings/microsoft-apps" className="underline">{chunk}</Link>
        ),
      })}
    </Text>
  );
}

/** One Microsoft app per tenant: the user picks the organization the account belongs to. */
function MicrosoftAppPicker({ apps, selected, onSelect }: MicrosoftAppPickerProps) {
  const t = useT();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="pb-2">
        <Text size="sm" tone="muted" align="left">{t("Organization of the account")}</Text>
      </legend>
      {apps.map((app) => (
        <label
          key={app.key}
          className="flex items-center gap-2 rounded-xl border border-interactive-border px-3 py-2 cursor-pointer has-checked:bg-background-hover"
        >
          <input
            type="radio"
            name="microsoft-app"
            value={app.key}
            checked={selected === app.key}
            onChange={() => onSelect(app.key)}
          />
          <Text size="sm" align="left">{app.label}</Text>
        </label>
      ))}
    </fieldset>
  );
}

export function LinkOAuthPreamble({ provider }: LinkOAuthPreambleProps) {
  const isOutlook = provider === "outlook";
  const { data: microsoftApps } = useMicrosoftApps(isOutlook);
  const [chosenApp, setChosenApp] = useState<string | null>(null);
  const apps = microsoftApps ?? [];
  const selectedApp = chosenApp ?? apps[0]?.key ?? null;
  // Outlook always names the organization, even with one, so the account goes to the right tenant.
  const missingApps = isOutlook && microsoftApps !== undefined && apps.length === 0;

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isOutlook && !selectedApp) {
      return;
    }
    track(ANALYTICS_EVENTS.oauth_authorize_started, { oauth_is_reconnect: false, provider_name: provider });
    const search = new URLSearchParams({ provider });
    if (isOutlook && selectedApp) {
      search.set("app", selectedApp);
    }
    window.location.href = `/api/sources/authorize?${search.toString()}`;
  };

  let picker: ReactNode = null;
  if (missingApps) {
    picker = <NoMicrosoftApps />;
  } else if (isOutlook && selectedApp) {
    picker = <MicrosoftAppPicker apps={apps} selected={selectedApp} onSelect={setChosenApp} />;
  }

  return (
    <PreambleLayout
      provider={provider}
      onSubmit={handleSubmit}
      picker={picker}
      submitDisabled={isOutlook && !selectedApp}
    />
  );
}

export function ProviderIconPair({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-4 pb-4">
      <div className="size-14 rounded-xl border border-interactive-border shadow-xs p-3 flex items-center justify-center bg-background-inverse">
        <SutraMark className="size-full rounded-lg text-foreground-inverse p-1" />
      </div>
      <ArrowLeftRight size={20} className="text-foreground-muted" />
      <div className="size-14 rounded-xl border border-interactive-border shadow-xs p-1 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
