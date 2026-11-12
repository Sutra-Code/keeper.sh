import { createFileRoute } from "@tanstack/react-router";
import { CalDAVConnectPage } from "@/features/auth/components/caldav-connect-page";
import { AppPasswordHelp } from "@/features/auth/components/app-password-help";
import { rich, useT } from "@/i18n";

export const Route = createFileRoute(
  "/(dashboard)/dashboard/connect/fastmail",
)({
  component: ConnectFastmailPage,
});

function ConnectFastmailPage() {
  const t = useT();

  return (
    <CalDAVConnectPage
      provider="fastmail"
      icon={<img src="/integrations/icon-fastmail.svg" alt="Fastmail" width={40} height={40} className="size-full rounded-lg p-3" />}
      heading={t("Connect Fastmail")}
      credentialHelp={
        <AppPasswordHelp
          provider="fastmail"
          settingsUrl="https://www.fastmail.com/settings/security/devicekeys"
          settingsLabel={t("Open Fastmail settings")}
          sectionLabel={t("Choose Manage app password and access")}
        />
      }
      description={t("Fastmail uses an app-specific password to authenticate SutraCode Calendar to interact with your calendar.")}
      steps={[
        rich(t("Navigate to <link>Fastmail Settings</link>"), {
          link: (chunk) => (
            <a key="link" href="https://www.fastmail.com/settings/security/devicekeys" target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-2">
              {chunk}
            </a>
          ),
        }),
        t("Click “Manage app password and access”"),
        t("Click “New app password”"),
        t("Under “Access”, select “Calendars (CalDAV)”"),
        t("Click “Generate password”"),
        t("Copy the password, and paste it below"),
      ]}
    />
  );
}
