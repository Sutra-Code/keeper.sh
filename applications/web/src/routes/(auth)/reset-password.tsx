import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import CircleCheck from "lucide-react/dist/esm/icons/circle-check";
import { resetPassword } from "@/lib/auth";
import { track, ANALYTICS_EVENTS } from "@/lib/analytics";
import { fetchAuthCapabilitiesWithApi } from "@/lib/auth-capabilities";
import { resolveErrorMessage } from "@/utils/errors";
import { Button, ButtonText } from "@/components/ui/primitives/button";
import { Heading2 } from "@/components/ui/primitives/heading";
import { Input } from "@/components/ui/primitives/input";
import { Text } from "@/components/ui/primitives/text";
import { TextLink } from "@/components/ui/primitives/text-link";
import { AuthSwitchPrompt } from "@/features/auth/components/auth-switch-prompt";
import { msg, useT } from "@/i18n";

type SearchParams = { token?: string };

export const Route = createFileRoute("/(auth)/reset-password")({
  loader: async ({ context }) => {
    const capabilities = await fetchAuthCapabilitiesWithApi(context.fetchApi);
    if (!capabilities.supportsPasswordReset) {
      throw redirect({ to: "/login" });
    }
    return capabilities;
  },
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();

  if (!token) return <InvalidTokenState />;
  return <ResetPasswordForm token={token} />;
}

function ResetPasswordForm({ token }: { token: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!password || !confirmPassword) return;
    if (password !== confirmPassword) {
      setError(msg("Passwords do not match."));
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      await resetPassword(token, password);
      track(ANALYTICS_EVENTS.password_reset_completed);
      setStatus("success");
    } catch (err) {
      setError(resolveErrorMessage(err, msg("Failed to reset password")));
      setStatus("idle");
    }
  };

  if (status === "success") return <SuccessState />;

  return (
    <>
      <div className="flex flex-col py-2">
        <Heading2 as="span" className="text-center">{t("Set new password")}</Heading2>
        <Text size="sm" tone="muted" align="center">
          {t("Enter your new password below.")}
        </Text>
      </div>
      {error && <Text size="sm" tone="danger" align="center">{t(error)}</Text>}
      <form onSubmit={handleSubmit} className="contents">
        <Input
          name="password"
          type="password"
          placeholder={t("New password")}
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
        <Input
          name="confirmPassword"
          type="password"
          placeholder={t("Confirm password")}
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
        <Button type="submit" className="w-full justify-center" disabled={status === "loading"}>
          <ButtonText>{t("Reset password")}</ButtonText>
        </Button>
      </form>
    </>
  );
}

function SuccessState() {
  const t = useT();
  return (
    <>
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="p-3 rounded-full bg-background-muted">
          <CircleCheck size={24} className="text-foreground-muted" />
        </div>
        <div className="flex flex-col">
          <Heading2 as="span" className="text-center">{t("Password reset")}</Heading2>
          <Text size="sm" tone="muted" align="center">
            {t("Your password has been successfully reset.")}
          </Text>
        </div>
      </div>
      <AuthSwitchPrompt>
        <TextLink to="/login">{t("Back to sign in")}</TextLink>
      </AuthSwitchPrompt>
    </>
  );
}

function InvalidTokenState() {
  const t = useT();
  return (
    <>
      <div className="flex flex-col py-2">
        <Heading2 as="span" className="text-center">{t("Invalid link")}</Heading2>
        <Text size="sm" tone="muted" align="center">
          {t("This password reset link is invalid or has expired.")}
        </Text>
      </div>
      <AuthSwitchPrompt>
        <TextLink to="/forgot-password">{t("Request a new link")}</TextLink>
      </AuthSwitchPrompt>
    </>
  );
}
