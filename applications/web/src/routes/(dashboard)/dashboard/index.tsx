import { useEffect, useState, useTransition } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import useSWR, { preload, SWRConfig, useSWRConfig } from "swr";
import { AnimatedReveal } from "@/components/ui/primitives/animated-reveal";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import CalendarPlus from "lucide-react/dist/esm/icons/calendar-plus";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";
import Link2 from "lucide-react/dist/esm/icons/link-2";
import Settings from "lucide-react/dist/esm/icons/settings";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import User from "lucide-react/dist/esm/icons/user";
import { ErrorState } from "@/components/ui/primitives/error-state";
import { signOut } from "@/lib/auth";
import { track, ANALYTICS_EVENTS } from "@/lib/analytics";
import { apiFetch, fetcher } from "@/lib/fetcher";
import { invalidateAccountsAndSources } from "@/lib/swr";
import { resolveErrorMessage } from "@/utils/errors";
import { useCountdown } from "@/hooks/use-countdown";
import {
  formatRefreshFailures,
  formatRefreshSummary,
  refreshCalendarsResponseSchema,
} from "@/features/dashboard/components/refresh-summary";
import { EventGraph } from "@/features/dashboard/components/event-graph";
import { ProviderIcon } from "@/components/ui/primitives/provider-icon";
import type { AccountColor } from "@keeper.sh/data-schemas";
import type { CalendarAccount, CalendarSource } from "@/types/api";
import {
  NavigationMenu,
  NavigationMenuButtonItem,
  NavigationMenuLinkItem,
  NavigationMenuItemIcon,
  NavigationMenuItemLabel,
  NavigationMenuItemTrailing,
} from "@/components/ui/composites/navigation-menu/navigation-menu-items";
import { NavigationMenuPopover } from "@/components/ui/composites/navigation-menu/navigation-menu-popover";
import { Text } from "@/components/ui/primitives/text";
import { ProviderIconStack } from "@/components/ui/primitives/provider-icon-stack";
import { pluralize } from "@/lib/pluralize";
import { useAnimatedSWR } from "@/hooks/use-animated-swr";
import { SyncStatus } from "@/features/dashboard/components/sync-status";
import { AccountSyncMenu } from "@/features/dashboard/components/account-sync-menu";
import { AccountColorDot } from "@/features/dashboard/components/account-color-dot";
import { resolveAccountColors, useAccountColors } from "@/features/dashboard/account-colors";
import TriangleAlert from "lucide-react/dist/esm/icons/triangle-alert";
import { useReauthAccounts } from "@/features/dashboard/components/reauth/use-reauth-accounts";
import { DashboardReauthNotice } from "@/features/dashboard/components/reauth/reauth-notice";
import { useSubscription, fetchSubscriptionStateWithApi } from "@/hooks/use-subscription";
import { useHasConfiguredSync } from "@/hooks/use-entitlements";
import { PlanMenuItem } from "@/features/dashboard/components/plan-menu";
import { isPlanShownOnHome } from "@/features/dashboard/components/plan-placement";
import { useOnboarding } from "@/features/onboarding/use-onboarding";
import { useSyncPairs } from "@/features/onboarding/use-sync-pairs";
import { Onboarding } from "@/features/onboarding/components/onboarding";
import { SyncPairRow } from "@/features/onboarding/components/sync-pair-row";
import { USAGE_CACHE_KEY } from "@/hooks/use-entitlements";
import { showToastAtom } from "@/state/toast";
import { useSetAtom } from "jotai";
import { msg, useLocale, useT } from "@/i18n";

async function loadSubscription(context: {
  fetchApi: <T>(path: string, init?: RequestInit) => Promise<T>;
  runtimeConfig: { commercialMode: boolean };
}) {
  if (!context.runtimeConfig.commercialMode) return undefined;
  try {
    return await fetchSubscriptionStateWithApi(context.fetchApi);
  } catch (error) {
    console.error("[subscription] dashboard loader preload failed, deferring to the client read:", error);
    return undefined;
  }
}

const SETUP_DATA_PATHS = ["/api/sources", "/api/accounts", USAGE_CACHE_KEY, "/api/mappings"] as const;

async function loadSetupData(context: {
  fetchApi: <T>(path: string, init?: RequestInit) => Promise<T>;
}): Promise<Record<string, unknown>> {
  const entries = await Promise.all(SETUP_DATA_PATHS.map(async (path) => {
    try {
      return [[path, await context.fetchApi<unknown>(path)]];
    } catch (error) {
      console.error(`[setup] dashboard loader preload of ${path} failed, deferring to the client read:`, error);
      return [];
    }
  }));
  return Object.fromEntries(entries.flat());
}

interface DashboardSearch {
  connected?: string;
}

export const Route = createFileRoute("/(dashboard)/dashboard/")({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    connected: typeof search.connected === "string" ? search.connected : undefined,
  }),
  loader: async ({ context }) => {
    const [subscription, setupData] = await Promise.all([loadSubscription(context), loadSetupData(context)]);
    return { commercialMode: context.runtimeConfig.commercialMode, setupData, subscription };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { setupData } = Route.useLoaderData();
  return (
    <SWRConfig value={{ fallback: setupData }}>
      <DashboardContent />
    </SWRConfig>
  );
}

function useConnectedToast(accounts: CalendarAccount[] | undefined) {
  const { connected } = Route.useSearch();
  const navigate = useNavigate();
  const showToast = useSetAtom(showToastAtom);
  const t = useT();
  const account = accounts?.find(({ id }) => id === connected);

  useEffect(() => {
    if (!connected || !accounts) return;
    if (account) showToast(t("{provider} connected", { provider: account.providerName }));
    navigate({ replace: true, search: {}, to: "/dashboard" });
  }, [connected, accounts, account, showToast, navigate, t]);
}

function DashboardContent() {
  const onboarding = useOnboarding();
  useConnectedToast(onboarding?.accounts);

  if (!onboarding) return null;
  if (onboarding.step !== "home") return <Onboarding state={onboarding} />;
  return <Home />;
}

function Home() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    track(ANALYTICS_EVENTS.logout);
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="flex flex-col">
      <SyncStatus />
      <EventGraph />
      <div className="flex flex-col gap-1.5">
        <DashboardReauthNotice />
        <CalendarsMenu />
        <AccountSyncMenu />
        <SyncPairsMenu />
        <PlanMenu />
        <AccountsMenu onLogout={handleLogout} />
      </div>
    </div>
  );
}

interface RefreshStatus {
  message: string;
  tone: "muted" | "danger";
}

function PlanMenu() {
  const { commercialMode, subscription: loaderSubscription } = Route.useLoaderData();
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription({
    fallbackData: loaderSubscription,
  });
  const isPro = subscription?.plan === "pro";
  const hasConfiguredSync = useHasConfiguredSync();

  if (!commercialMode || !isPlanShownOnHome({ isPro, hasConfiguredSync })) {
    return null;
  }

  return (
    <NavigationMenu variant={isPro ? "default" : "highlight"}>
      <PlanMenuItem subscription={subscription} subscriptionLoading={subscriptionLoading} />
    </NavigationMenu>
  );
}

function useRefreshCalendars() {
  const t = useT();
  const { mutate: globalMutate } = useSWRConfig();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [status, setStatus] = useState<RefreshStatus | null>(null);
  const { secondsRemaining, start: startCooldown } = useCountdown();

  const refresh = () => {
    setStatus(null);

    startRefreshTransition(async () => {
      try {
        const response = await apiFetch("/api/accounts/refresh-calendars", { method: "POST" });
        const result = refreshCalendarsResponseSchema.assert(await response.json());
        track(ANALYTICS_EVENTS.calendars_refreshed, { accounts: result.accounts });
        await invalidateAccountsAndSources(globalMutate);
        startCooldown(result.cooldownSeconds);

        const failures = formatRefreshFailures(result.failed, t);
        setStatus({
          message: [formatRefreshSummary(result, t), failures].filter(Boolean).join(" "),
          tone: failures ? "danger" : "muted",
        });
      } catch (err) {
        setStatus({
          message: t(resolveErrorMessage(err, msg("Failed to refresh calendars."))),
          tone: "danger",
        });
      }
    });
  };

  return { isRefreshing, refresh, secondsRemaining, status };
}

function SyncPairsMenu() {
  const { data: calendars } = useSWR<CalendarSource[]>("/api/sources");
  const pairs = useSyncPairs(calendars);
  if (pairs.length === 0) return null;

  return (
    <NavigationMenu>
      {pairs.map(({ pair, source }) => <SyncPairRow key={pair.key} pair={pair} source={source} />)}
    </NavigationMenu>
  );
}

function AttentionDot() {
  return (
    <span className="size-1.5 shrink-0 rounded-full bg-linear-to-b from-amber-400 to-amber-500" />
  );
}

function CalendarAccountDot({ color }: { color: AccountColor | undefined }) {
  if (!color) return null;
  return <AccountColorDot color={color} />;
}

function CalendarsMenu() {
  const t = useT();
  const locale = useLocale();
  const reauthIds = new Set(useReauthAccounts().map((account) => account.id));
  const { data: calendarsData, shouldAnimate: animateCalendars, isLoading: calendarsLoading, error, mutate: mutateCalendars } = useAnimatedSWR<CalendarSource[]>("/api/sources");
  const calendars = calendarsData ?? [];
  const { colorByAccountId } = useAccountColors();

  const { data: eventCountData, error: eventCountError } = useSWR<{ count: number }>("/api/events/count");
  const eventCount = eventCountError ? undefined : eventCountData?.count;

  const { isRefreshing, refresh, secondsRemaining, status } = useRefreshCalendars();
  const isCoolingDown = secondsRemaining > 0;

  return (
    <>
      <NavigationMenu>
        <NavigationMenuPopover
          disabled={calendars.length === 0 && !calendarsLoading}
          trigger={
            <>
              <NavigationMenuItemIcon>
                <Calendar size={15} />
              </NavigationMenuItemIcon>
              <NavigationMenuItemLabel>
                {calendars.length > 0 ? t("Calendars") : t("No calendars")}
              </NavigationMenuItemLabel>
              <NavigationMenuItemTrailing>
                <ProviderIconStack
                  providers={calendars}
                  leading={
                    calendars.some((calendar) => reauthIds.has(calendar.accountId))
                      ? <AttentionDot />
                      : undefined
                  }
                />
              </NavigationMenuItemTrailing>
            </>
          }
        >
          {error && <ErrorState message={t("Failed to load calendars.")} onRetry={() => mutateCalendars()} />}
          {calendarsLoading && (
            <div className="flex justify-center py-4">
              <LoaderCircle size={16} className="animate-spin text-foreground-muted" />
            </div>
          )}
          {calendars.map((calendar) => (
            <NavigationMenuLinkItem
              key={calendar.id}
              to={`/dashboard/accounts/${calendar.accountId}/${calendar.id}`}
              onMouseEnter={() => {
                preload(`/api/accounts/${calendar.accountId}`, fetcher);
                preload(`/api/sources/${calendar.id}`, fetcher);
              }}
            >
              <NavigationMenuItemIcon>
                <ProviderIcon provider={calendar.provider} calendarType={calendar.calendarType} />
              </NavigationMenuItemIcon>
              <CalendarAccountDot color={colorByAccountId.get(calendar.accountId)} />
              <NavigationMenuItemLabel
                className="shrink-0"
                tone={reauthIds.has(calendar.accountId) ? "attention" : undefined}
              >
                {calendar.name}
              </NavigationMenuItemLabel>
              <NavigationMenuItemTrailing
                className="overflow-hidden"
                indicator={
                  reauthIds.has(calendar.accountId)
                    ? <TriangleAlert size={15} className="shrink-0 text-attention" />
                    : undefined
                }
              >
                <Text
                  size="sm"
                  tone={reauthIds.has(calendar.accountId) ? "attention" : "muted"}
                  align="right"
                  className="flex-1 min-w-0 truncate"
                >
                  {calendar.unavailableSince ? t("Unavailable") : calendar.accountLabel}
                </Text>
              </NavigationMenuItemTrailing>
            </NavigationMenuLinkItem>
          ))}
        </NavigationMenuPopover>
        <NavigationMenuLinkItem to="/dashboard/connect">
          <NavigationMenuItemIcon>
            <CalendarPlus size={15} />
          </NavigationMenuItemIcon>
          <NavigationMenuItemLabel>{t("Add a calendar")}</NavigationMenuItemLabel>
          <NavigationMenuItemTrailing />
        </NavigationMenuLinkItem>
        <NavigationMenuButtonItem
          onClick={isRefreshing || isCoolingDown ? undefined : refresh}
          disabled={isRefreshing || isCoolingDown}
        >
          <NavigationMenuItemIcon>
            <RefreshCw size={15} />
          </NavigationMenuItemIcon>
          <NavigationMenuItemLabel>
            {isRefreshing ? t("Refreshing...") : t("Refresh calendars")}
          </NavigationMenuItemLabel>
          <NavigationMenuItemTrailing>
            {isCoolingDown && <Text size="sm" tone="muted">{secondsRemaining}s</Text>}
          </NavigationMenuItemTrailing>
        </NavigationMenuButtonItem>
        <AnimatedReveal show={calendars.length > 0} skipInitial={!animateCalendars}>
          <NavigationMenuLinkItem to="/dashboard/events">
            <NavigationMenuItemIcon>
              <CalendarDays size={15} />
            </NavigationMenuItemIcon>
            <NavigationMenuItemLabel>{t("View events")}</NavigationMenuItemLabel>
            <NavigationMenuItemTrailing>
              {eventCount != null && <Text size="sm" tone="muted">{pluralize(eventCount, t("event"), t("events"), locale)}</Text>}
            </NavigationMenuItemTrailing>
          </NavigationMenuLinkItem>
          <NavigationMenuLinkItem to="/dashboard/ical">
            <NavigationMenuItemIcon>
              <Link2 size={15} />
            </NavigationMenuItemIcon>
            <NavigationMenuItemLabel>{t("iCal feeds")}</NavigationMenuItemLabel>
            <NavigationMenuItemTrailing />
          </NavigationMenuLinkItem>
        </AnimatedReveal>
      </NavigationMenu>
      {status && <Text size="sm" tone={status.tone}>{status.message}</Text>}
    </>
  );
}

function AccountsMenu({ onLogout }: { onLogout: () => void }) {
  const t = useT();
  const reauthAccounts = useReauthAccounts();
  const reauthIds = new Set(reauthAccounts.map((account) => account.id));
  return (
    <NavigationMenu>
      <AccountsPopover reauthIds={reauthIds} />
      <NavigationMenuLinkItem to="/dashboard/settings">
        <NavigationMenuItemIcon>
          <Settings size={15} />
        </NavigationMenuItemIcon>
        <NavigationMenuItemLabel>{t("Settings")}</NavigationMenuItemLabel>
        <NavigationMenuItemTrailing />
      </NavigationMenuLinkItem>
      <NavigationMenuButtonItem onClick={onLogout}>
        <NavigationMenuItemIcon>
          <LogOut size={15} />
        </NavigationMenuItemIcon>
        <NavigationMenuItemLabel>{t("Log out")}</NavigationMenuItemLabel>
      </NavigationMenuButtonItem>
    </NavigationMenu>
  );
}

function AccountsPopover({ reauthIds }: { reauthIds: Set<string> }) {
  const t = useT();
  const { data: accountsData, isLoading: accountsLoading, error: accountsError, mutate: mutateAccounts } = useAnimatedSWR<CalendarAccount[]>("/api/accounts");
  const accounts = accountsData ?? [];
  const accountColors = resolveAccountColors(accounts);

  return (
    <NavigationMenuPopover
      disabled={accounts.length === 0 && !accountsLoading}
      trigger={
        <>
          <NavigationMenuItemIcon>
            <User size={15} />
          </NavigationMenuItemIcon>
          <NavigationMenuItemLabel>
            {accounts.length > 0 ? t("Calendar sources") : t("No calendar sources")}
          </NavigationMenuItemLabel>
          <NavigationMenuItemTrailing>
            <ProviderIconStack
              providers={accounts}
              leading={
                reauthIds.size > 0
                  ? <AttentionDot />
                  : undefined
              }
            />
          </NavigationMenuItemTrailing>
        </>
      }
    >
      {accountsError && <ErrorState message={t("Failed to load accounts.")} onRetry={() => mutateAccounts()} />}
      {accountsLoading && (
        <div className="flex justify-center py-4">
          <LoaderCircle size={16} className="animate-spin text-foreground-muted" />
        </div>
      )}
      {accounts.map((account) => {
        const needsReauth = reauthIds.has(account.id);
        return (
          <NavigationMenuLinkItem
            key={account.id}
            to={`/dashboard/accounts/${account.id}`}
          >
            <NavigationMenuItemIcon>
              <ProviderIcon provider={account.provider} />
            </NavigationMenuItemIcon>
            <CalendarAccountDot color={accountColors.get(account.id)} />
            <NavigationMenuItemLabel tone={needsReauth ? "attention" : undefined}>
              {account.accountLabel}
            </NavigationMenuItemLabel>
            <NavigationMenuItemTrailing
              indicator={
                needsReauth ? (
                  <TriangleAlert
                    size={15}
                    className="shrink-0 text-amber-600 dark:text-amber-400"
                  />
                ) : undefined
              }
            />
          </NavigationMenuLinkItem>
        );
      })}
    </NavigationMenuPopover>
  );
}
