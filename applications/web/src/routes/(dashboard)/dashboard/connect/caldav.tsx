import { createFileRoute } from "@tanstack/react-router";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import { Text } from "@/components/ui/primitives/text";
import { CalDAVConnectPage } from "@/features/auth/components/caldav-connect-page";
import { useT } from "@/i18n";

export const Route = createFileRoute("/(dashboard)/dashboard/connect/caldav")({
  component: ConnectCalDAVPage,
});

function ConnectCalDAVPage() {
  const t = useT();

  return (
    <CalDAVConnectPage
      provider="caldav"
      icon={<Calendar size={28} className="text-foreground-muted" />}
      heading={t("Connect CalDAV Server")}
      description={t("Connect to any CalDAV-compatible server.")}
      steps={[
        t("Enter your CalDAV server URL"),
        t("Provide a username"),
        t("Enter a password, or app-specific password"),
        t("Click “Connect”"),
      ]}
      footer={
        <Text size="sm" tone="muted" align="left">
          {t("Your CalDAV server URL can typically be found in your calendar provider's settings or documentation.")}
        </Text>
      }
    />
  );
}
