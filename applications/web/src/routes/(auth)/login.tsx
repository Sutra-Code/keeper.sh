import { createFileRoute } from "@tanstack/react-router";
import { AuthForm, type AuthScreenCopy } from "@/features/auth/components/auth-form";
import { fetchAuthCapabilitiesWithApi } from "@/lib/auth-capabilities";
import {
  getMcpAuthorizationSearch,
  toStringSearchParams,
} from "@/lib/mcp-auth-flow";
import { msg } from "@/i18n";

export const Route = createFileRoute("/(auth)/login")({
  loader: ({ context }) => fetchAuthCapabilitiesWithApi(context.fetchApi),
  component: LoginPage,
  validateSearch: toStringSearchParams,
});

const copy: AuthScreenCopy = {
  heading: msg("Welcome back"),
  subtitle: msg("Sign in to your account"),
  oauthActionLabel: msg("Sign in"),
  submitLabel: msg("Sign in"),
  action: "signIn",
};

function LoginPage() {
  const capabilities = Route.useLoaderData();
  const search = Route.useSearch();

  return (
    <AuthForm
      capabilities={capabilities}
      copy={copy}
      authorizationSearch={getMcpAuthorizationSearch(search) ?? undefined}
    />
  );
}
