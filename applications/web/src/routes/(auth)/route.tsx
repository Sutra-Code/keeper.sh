import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMcpAuthorizationSearch } from "@/lib/mcp-auth-flow";
import { resolveAuthRedirect } from "@/lib/route-access-guards";
import SutraMark from "@/assets/sutra-mark.svg?react";
import { SourceNotice } from "@/components/ui/primitives/source-notice";
import { SutraWordmark } from "@/components/ui/primitives/sutra-wordmark";

export const Route = createFileRoute("/(auth)")({
  beforeLoad: ({ context, search }) => {
    if (getMcpAuthorizationSearch(search)) {
      return;
    }

    const redirectTarget = resolveAuthRedirect(context.auth.hasSession());
    if (redirectTarget) {
      throw redirect({ to: redirectTarget });
    }
  },
  component: AuthLayout,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});

function AuthLayout() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas p-3 sm:p-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] bg-background p-2 md:grid-cols-2">
        <section
          aria-hidden="true"
          className="tex-dust hidden min-h-[30rem] flex-col justify-between rounded-[1.6rem] bg-well p-8 md:flex"
        >
          <SutraMark className="size-10 text-foreground" />
          <div>
            <p className="font-display text-3xl font-medium leading-tight tracking-tight text-foreground">
              Every calendar,
              <br />
              in one place.
            </p>
            <p className="mt-3 max-w-xs text-sm text-foreground-muted">
              Keep your availability in sync across all of your calendars.
            </p>
          </div>
        </section>
        <div className="flex flex-col rounded-[1.6rem] bg-background-elevated p-6 sm:p-10">
          <SutraWordmark className="mb-10" />
          <div className="flex w-full flex-col gap-2">
            <Outlet />
          </div>
          <SourceNotice className="mt-auto pt-8" />
        </div>
      </div>
    </main>
  );
}
