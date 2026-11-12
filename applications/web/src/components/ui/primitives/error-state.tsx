import { Text } from "./text";
import { Button, ButtonText } from "./button";
import { msg, useT } from "@/i18n";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = msg("Something went wrong. Please try again."),
  onRetry,
}: ErrorStateProps) {
  const t = useT();

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <Text size="sm" tone="danger">
        {t(message)}
      </Text>
      {onRetry && (
        <Button variant="border" size="compact" onClick={onRetry}>
          <ButtonText>{t("Retry")}</ButtonText>
        </Button>
      )}
    </div>
  );
}
