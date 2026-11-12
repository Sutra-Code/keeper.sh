import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button, ButtonText } from "@/components/ui/primitives/button";
import { Input } from "@/components/ui/primitives/input";
import { Text } from "@/components/ui/primitives/text";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalTitle,
} from "@/components/ui/primitives/modal";
import { deleteAccount, reauthenticate, signOut } from "@/lib/auth";
import {
  resolveDeleteAccountDescription,
  resolveReauthenticationMethods,
} from "@/lib/account-reauthentication";
import type { DeleteAccountStep, ReauthenticationMethod } from "@/lib/account-reauthentication";
import { resolveOidcProviderName } from "@/lib/auth-capabilities";
import type { AuthCapabilities } from "@/lib/auth-capabilities";
import { track, ANALYTICS_EVENTS } from "@/lib/analytics";
import { resolveErrorMessage } from "@/utils/errors";
import type { SessionUser } from "@/hooks/use-session";
import { msg, useT, type Translate } from "@/i18n";

interface DeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SessionUser | null;
  capabilities: AuthCapabilities;
  hasPassword: boolean;
  linkedProviderIds: string[];
  passkeyCount: number;
}

const methodKey = (method: ReauthenticationMethod): string => {
  if (method.kind === "passkey") return "passkey";
  return method.provider;
};

const resolveMethodLabel = (
  method: ReauthenticationMethod,
  capabilities: AuthCapabilities,
  t: Translate,
): string => {
  if (method.kind === "passkey") return t("Confirm with passkey");
  if (method.provider === "google") return t("Continue with {provider}", { provider: "Google" });
  if (method.provider === "microsoft") return t("Continue with {provider}", { provider: "Outlook" });
  return t("Continue with {provider}", { provider: resolveOidcProviderName(capabilities) });
};

export function DeleteAccountModal({
  open,
  onOpenChange,
  user,
  capabilities,
  hasPassword,
  linkedProviderIds,
  passkeyCount,
}: DeleteAccountModalProps) {
  const navigate = useNavigate();
  const t = useT();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<DeleteAccountStep>("confirm");
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const methods = resolveReauthenticationMethods({
    capabilities,
    linkedProviderIds,
    passkeyCount,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep("confirm");
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const runDeletion = async () => {
    const password = hasPassword ? passwordRef.current?.value : undefined;
    if (hasPassword && !password) return;
    const outcome = await deleteAccount(password);
    if (outcome === "reauthentication-required") {
      setStep("reauthenticate");
      return;
    }
    track(ANALYTICS_EVENTS.account_deleted);
    onOpenChange(false);
    navigate({ to: "/login" });
  };

  const runSafely = async (work: () => Promise<void>, fallback: string) => {
    setError(null);
    setIsWorking(true);
    try {
      await work();
    } catch (err) {
      setError(resolveErrorMessage(err, fallback));
    } finally {
      setIsWorking(false);
    }
  };

  const handleDelete = () => runSafely(runDeletion, msg("Failed to delete account."));

  const handleReauthenticate = (method: ReauthenticationMethod) =>
    runSafely(async () => {
      if (!user) return;
      await reauthenticate(method, user);
      if (method.kind === "passkey") {
        setStep("confirm");
        await runDeletion();
      }
    }, msg("Couldn't confirm it's you."));

  const handleSignOut = () =>
    runSafely(async () => {
      track(ANALYTICS_EVENTS.logout);
      await signOut();
      onOpenChange(false);
      navigate({ to: "/login" });
    }, msg("Couldn't sign out."));

  const needsSignOut = step === "reauthenticate" && methods.length === 0;

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent>
        <ModalTitle>{t("Delete account?")}</ModalTitle>
        <ModalDescription>
          {t(resolveDeleteAccountDescription({ methodCount: methods.length, step }))}
        </ModalDescription>
        {step === "confirm" && hasPassword && (
          <Input ref={passwordRef} type="password" placeholder={t("Confirm your password")} />
        )}
        {error && <Text size="sm" tone="danger">{t(error)}</Text>}
        <ModalFooter>
          {step === "confirm" && (
            <Button variant="destructive" className="w-full justify-center" onClick={handleDelete} disabled={isWorking}>
              <ButtonText>{isWorking ? t("Deleting...") : t("Delete my account")}</ButtonText>
            </Button>
          )}
          {step === "reauthenticate" && methods.map((method) => (
            <Button
              key={methodKey(method)}
              variant="border"
              className="w-full justify-center"
              onClick={() => handleReauthenticate(method)}
              disabled={isWorking}
            >
              <ButtonText>{resolveMethodLabel(method, capabilities, t)}</ButtonText>
            </Button>
          ))}
          {needsSignOut && (
            <Button variant="border" className="w-full justify-center" onClick={handleSignOut} disabled={isWorking}>
              <ButtonText>{t("Sign out")}</ButtonText>
            </Button>
          )}
          <Button variant="elevated" className="w-full justify-center" onClick={() => handleOpenChange(false)}>
            <ButtonText>{t("Cancel")}</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
