import { Text } from "@/components/ui/primitives/text";
import { rich, useT } from "@/i18n";

interface ConsentClientSummaryProps {
  clientName: string | null;
  redirectDestination: string | null;
}

function ClientRequest({ clientName }: { clientName: string | null }) {
  const t = useT();

  if (!clientName) {
    return (
      <Text size="sm" tone="muted" align="left">
        {t("An app that didn't give a name is requesting permission to access your SutraCode Calendar data.")}
      </Text>
    );
  }

  return (
    <Text size="sm" tone="muted" align="left">
      {rich(
        t("An app calling itself <name></name> is requesting permission to access your SutraCode Calendar data. SutraCode Calendar hasn't verified this name."),
        {
          name: () => (
            <span key="name" className="font-medium text-foreground">&ldquo;{clientName}&rdquo;</span>
          ),
        },
      )}
    </Text>
  );
}

function RedirectWarning({ redirectDestination }: { redirectDestination: string | null }) {
  const t = useT();

  if (!redirectDestination) {
    return null;
  }

  return (
    <Text size="sm" tone="muted" align="left">
      {rich(
        t("If you allow it, you'll be sent to <destination></destination>. Only continue if you trust that address."),
        {
          destination: () => (
            <span key="destination" className="font-medium text-foreground break-words">{redirectDestination}</span>
          ),
        },
      )}
    </Text>
  );
}

export function ConsentClientSummary({ clientName, redirectDestination }: ConsentClientSummaryProps) {
  return (
    <>
      <ClientRequest clientName={clientName} />
      <RedirectWarning redirectDestination={redirectDestination} />
    </>
  );
}
