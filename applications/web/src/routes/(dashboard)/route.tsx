import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { AnimatePresence, LazyMotion } from "motion/react";
import { loadMotionFeatures } from "@/lib/motion-features";
import * as m from "motion/react-m";
import { popoverOverlayAtom } from "@/state/popover-overlay";
import { SyncProvider } from "@/providers/sync-provider";
import { Toaster } from "@/components/ui/primitives/toast";
import { resolveDashboardRedirect } from "@/lib/route-access-guards";
import { CalendarView } from "@/features/dashboard/components/calendar-view";
import { SidebarPageTransition } from "@/features/dashboard/components/sidebar-page-transition";
import { SutraWordmark } from "@/components/ui/primitives/sutra-wordmark";

export const Route = createFileRoute("/(dashboard)")({
  beforeLoad: ({ context }) => {
    const redirectTarget = resolveDashboardRedirect(context.auth.hasSession());
    if (redirectTarget) {
      throw redirect({ to: redirectTarget });
    }
  },
  component: DashboardLayout,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
    links: [
      {
        rel: "preload",
        href: "/assets/fonts/GeistMono-variable.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
    ],
  }),
});

function DashboardLayout() {
  const overlayActive = useAtomValue(popoverOverlayAtom);

  return (
    <div className="relative flex min-h-dvh justify-center lg:justify-start lg:gap-3 lg:bg-canvas lg:p-3">
      <div className="relative flex w-full max-w-sm shrink-0 flex-col gap-3 px-4 pb-(--sidebar-pad-b) pt-4 [--sidebar-pad-b:3rem] [--sidebar-pad-t:1.5rem] [--sidebar-pad-x:0.5rem] lg:h-[calc(100dvh-1.5rem)] lg:overflow-y-auto lg:rounded-[1.75rem] lg:bg-background lg:px-(--sidebar-pad-x) lg:pt-(--sidebar-pad-t)">
        <LazyMotion features={loadMotionFeatures}>
          <AnimatePresence>
            {overlayActive && (
              <m.div
                className="fixed inset-0 z-10 backdrop-blur-[2px] bg-black/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </AnimatePresence>
        </LazyMotion>
        <SyncProvider />
        <Toaster />
        <SutraWordmark className="mx-1 mb-6 shrink-0" />
        <SidebarPageTransition>
          <Outlet />
        </SidebarPageTransition>
      </div>
      {/* `isolate` keeps the calendar's sticky z-indices under the popover blur overlay (z-10). */}
      <div className="hidden lg:flex lg:h-[calc(100dvh-1.5rem)] lg:min-w-0 lg:flex-1 lg:isolate">
        <CalendarView />
      </div>
    </div>
  );
}
