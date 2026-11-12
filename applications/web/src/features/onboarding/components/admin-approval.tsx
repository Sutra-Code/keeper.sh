import { useSetAtom } from "jotai";
import Building2 from "lucide-react/dist/esm/icons/building-2";
import Copy from "lucide-react/dist/esm/icons/copy";
import Mail from "lucide-react/dist/esm/icons/mail";
import { LinkButton, ButtonText } from "@/components/ui/primitives/button";
import {
  NavigationMenu,
  NavigationMenuButtonItem,
  NavigationMenuItemIcon,
  NavigationMenuItemLabel,
} from "@/components/ui/composites/navigation-menu/navigation-menu-items";
import { track, ANALYTICS_EVENTS } from "@/lib/analytics";
import { showToastAtom } from "@/state/toast";
import { useT, type Translate } from "@/i18n";
import { OnboardingHeading } from "./onboarding-heading";

const buildApprovalEmail = (approvalUrl: string, t: Translate): string => {
  const subject = t("Approve SutraCode Calendar for our Microsoft 365 calendars");
  const body = t("Could you approve SutraCode Calendar so I can sync my work calendar? You can approve it here: {url}", {
    url: approvalUrl,
  });
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export function AdminApproval({ approvalUrl }: { approvalUrl: string }) {
  const t = useT();
  const showToast = useSetAtom(showToastAtom);

  const copyApprovalLink = async () => {
    await navigator.clipboard.writeText(approvalUrl);
    track(ANALYTICS_EVENTS.onboarding_admin_link_copied, { method: "copy" });
    showToast(t("Link copied"));
  };

  const emailApprovalLink = () => {
    track(ANALYTICS_EVENTS.onboarding_admin_link_copied, { method: "email" });
    globalThis.location.href = buildApprovalEmail(approvalUrl, t);
  };

  return (
    <div className="flex flex-col gap-3 pt-4">
      <OnboardingHeading
        icon={{ glyph: <Building2 size={22} strokeWidth={1.75} />, tone: "caution" }}
        title={t("Your organisation needs to approve SutraCode Calendar")}
        description={t("This work account only allows apps your IT admin has approved. Send them the approval link and you'll carry on here once they accept.")}
      />
      <NavigationMenu>
        <NavigationMenuButtonItem onClick={copyApprovalLink}>
          <NavigationMenuItemIcon>
            <Copy size={15} />
          </NavigationMenuItemIcon>
          <NavigationMenuItemLabel>{t("Copy approval link")}</NavigationMenuItemLabel>
        </NavigationMenuButtonItem>
        <NavigationMenuButtonItem onClick={emailApprovalLink}>
          <NavigationMenuItemIcon>
            <Mail size={15} />
          </NavigationMenuItemIcon>
          <NavigationMenuItemLabel>{t("Email it to your admin")}</NavigationMenuItemLabel>
        </NavigationMenuButtonItem>
      </NavigationMenu>
      <LinkButton to="/dashboard" variant="border" className="w-full justify-center">
        <ButtonText>{t("Use a personal calendar")}</ButtonText>
      </LinkButton>
    </div>
  );
}
