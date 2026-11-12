import { createFileRoute } from "@tanstack/react-router";
import { CalDAVConnectPage } from "@/features/auth/components/caldav-connect-page";
import { AppPasswordHelp } from "@/features/auth/components/app-password-help";
import { rich, useT } from "@/i18n";

export const Route = createFileRoute("/(dashboard)/dashboard/connect/apple")({
  component: ConnectApplePage,
});

function ConnectApplePage() {
  const t = useT();

  return (
    <CalDAVConnectPage
      provider="icloud"
      icon={<img src="/integrations/icon-icloud.svg" alt="iCloud" width={40} height={40} className="size-full rounded-lg p-3" />}
      heading={t("Connect iCloud")}
      credentialHelp={
        <AppPasswordHelp
          provider="icloud"
          settingsUrl="https://account.apple.com"
          settingsLabel={t("Open account.apple.com")}
          sectionLabel={t("Choose App-Specific Passwords")}
        />
      }
      description={t("iCloud uses an app-specific password to authenticate SutraCode Calendar to interact with your calendar.")}
      steps={[
        rich(t("Navigate to <link>iCloud Apple ID</link>"), {
          link: (chunk) => (
            <a key="link" href="https://appleid.apple.com" target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-2">
              {chunk}
            </a>
          ),
        }),
        t("Sign in with your Apple ID"),
        t("Select “App-Specific Passwords”"),
        t("Click the “+” next to “Passwords”"),
        t("Label and generate the password, then copy it"),
        t("Paste the app-specific password below"),
      ]}
    />
  );
}
