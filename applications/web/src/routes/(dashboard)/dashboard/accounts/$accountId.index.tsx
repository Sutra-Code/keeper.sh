import { useEffect, useMemo, useState, useTransition } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import useSWR, { preload, useSWRConfig } from "swr";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { BackButton } from "@/components/ui/primitives/back-button";
import { PageBody } from "@/components/ui/primitives/page-body";
import { StickyPageHeader } from "@/components/ui/primitives/sticky-page-header";
import { Pagination, PaginationPrevious, PaginationNext } from "@/components/ui/primitives/pagination";
import { RouteShell } from "@/components/ui/shells/route-shell";
import { Text } from "@/components/ui/primitives/text";
import { MenuGate } from "@/components/ui/primitives/menu-hint";
import { MetadataRow } from "@/features/dashboard/components/metadata-row";
import { useReauthAccounts } from "@/features/dashboard/components/reauth/use-reauth-accounts";
import { fetcher, apiFetch } from "@/lib/fetcher";
import { track, ANALYTICS_EVENTS } from "@/lib/analytics";
import { formatDate } from "@/lib/time";
import { invalidateAccountsAndSources } from "@/lib/swr";
import type { CalendarAccount, CalendarSource } from "@/types/api";
import {
  NavigationMenu,
  NavigationMenuEmptyItem,
  NavigationMenuButtonItem,
  NavigationMenuLinkItem,
  NavigationMenuItemIcon,
  NavigationMenuItemLabel,
  NavigationMenuItemTrailing,
} from "@/components/ui/composites/navigation-menu/navigation-menu-items";
import { DeleteConfirmation } from "@/components/ui/primitives/delete-confirmation";
import { DashboardSection } from "@/components/ui/primitives/dashboard-heading";
import { pluralize } from "@/lib/pluralize";
import { resolveErrorMessage } from "@/utils/errors";
import { canRefreshCalendars } from "@/utils/accounts";
import { msg, useLocale, useT } from "@/i18n";
import type { AccountColor } from "@keeper.sh/data-schemas";
import Palette from "lucide-react/dist/esm/icons/palette";
import { NavigationMenuItem } from "@/components/ui/composites/navigation-menu/navigation-menu-items";
import { AccountColorPicker } from "@/features/dashboard/components/account-color-picker";
import { resolveAccountColors } from "@/features/dashboard/account-colors";
import { formatTimeUntil } from "@/lib/time";

export const Route = createFileRoute(
  "/(dashboard)/dashboard/accounts/$accountId/",
)({
  component: AccountDetailPage,
});

function CalendarList({ calendars, accountId }: { calendars: CalendarSource[]; accountId: string }) {
  const t = useT();

  if (calendars.length === 0) {
    return <NavigationMenuEmptyItem>{t("No calendars")}</NavigationMenuEmptyItem>;
  }
  return calendars.map((calendar) => (
    <NavigationMenuLinkItem
      key={calendar.id}
      to={`/dashboard/accounts/${accountId}/${calendar.id}`}
      onMouseEnter={() => preload(`/api/sources/${calendar.id}`, fetcher)}
    >
      <NavigationMenuItemIcon>
        <Calendar size={15} />
      </NavigationMenuItemIcon>
      <NavigationMenuItemLabel>
        {calendar.name}
        {calendar.providerMissingSince && (
          <Text as="span" size="sm" tone="danger"> {t("(not found at provider)")}</Text>
        )}
      </NavigationMenuItemLabel>
      <NavigationMenuItemTrailing>
        {calendar.unavailableSince && <Text size="sm" tone="muted">{t("Unavailable")}</Text>}
      </NavigationMenuItemTrailing>
    </NavigationMenuLinkItem>
  ));
}

function RefreshCalendarsItem({ accountId }: { accountId: string }) {
  const t = useT();
  const locale = useLocale();
  const { mutate: globalMutate } = useSWRConfig();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const handleRefresh = () => {
    setResult(null);
    setRefreshError(null);

    startRefreshTransition(async () => {
      try {
        const response = await apiFetch(`/api/accounts/${accountId}/refresh`, { method: "POST" });
        const body: { imported: number; missing: number; restored: number } = await response.json();
        track(ANALYTICS_EVENTS.calendar_account_refreshed, {
          imported: body.imported,
          missing: body.missing,
          restored: body.restored,
        });
        setResult(
          t("{imported} imported, {missing} not found at the provider, {restored} back.", {
            imported: pluralize(body.imported, t("new calendar"), t("new calendars"), locale),
            missing: pluralize(body.missing, t("calendar"), t("calendars"), locale),
            restored: pluralize(body.restored, t("calendar"), t("calendars"), locale),
          }),
        );
        await invalidateAccountsAndSources(globalMutate, `/api/accounts/${accountId}`);
      } catch (err) {
        setRefreshError(resolveErrorMessage(err, msg("Failed to refresh calendars.")));
      }
    });
  };

  return (
    <>
      <NavigationMenuButtonItem onClick={handleRefresh} disabled={isRefreshing}>
        <Text size="sm">{isRefreshing ? t("Refreshing…") : t("Refresh Calendars")}</Text>
      </NavigationMenuButtonItem>
      {result && <Text size="sm" tone="muted" className="px-0.5">{result}</Text>}
      {refreshError && <Text size="sm" tone="danger" className="px-0.5">{t(refreshError)}</Text>}
    </>
  );
}

function AccountDetailPage() {
  const t = useT();
  const locale = useLocale();
  const { accountId } = Route.useParams();
  const needsReauth = useReauthAccounts().some((account) => account.id === accountId);
  const navigate = useNavigate();
  const { mutate: globalMutate } = useSWRConfig();
  const { data: account, isLoading: accountLoading, error: accountError } = useSWR<CalendarAccount>(
    `/api/accounts/${accountId}`,
  );
  const { data: allCalendars, isLoading: calendarsLoading, error: calendarsError } = useSWR<CalendarSource[]>(
    "/api/sources",
  );

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isLoading = accountLoading || calendarsLoading;
  const error = accountError || calendarsError;

  const handleConfirmDelete = () => {
    setDeleteError(null);

    startDeleteTransition(async () => {
      try {
        await apiFetch(`/api/accounts/${accountId}`, { method: "DELETE" });
        if (account) {
          track(ANALYTICS_EVENTS.calendar_account_deleted, { provider: account.provider });
        }
        await invalidateAccountsAndSources(globalMutate, `/api/accounts/${accountId}`);
        navigate({ to: "/dashboard" });
      } catch (err) {
        setDeleteError(resolveErrorMessage(err, msg("Failed to delete account.")));
      }
    });
  };

  if (error || isLoading || !account) {
    if (error) return <RouteShell status="error" onRetry={async () => { await invalidateAccountsAndSources(globalMutate, `/api/accounts/${accountId}`); }} />;
    return <RouteShell status="loading" />;
  }

  const calendars = (allCalendars ?? []).filter(
    (calendar) => calendar.accountId === accountId,
  );

  return (
    <div className="flex flex-col gap-1.5 lg:h-full">
      <StickyPageHeader>
        <div className="flex items-center justify-between">
          <BackButton />
          <AccountPrevNext accountId={accountId} />
        </div>
      </StickyPageHeader>
      <PageBody className="gap-1.5">
        <DashboardSection
          title={t("Account Information")}
          description={t("View details about the account and its calendars.")}
        />
        <MenuGate
          active={needsReauth}
          tone="attention"
          hint={t("Authorization for this account has been lost,")}
          action={{
            label: t("click here to restore access"),
            to: `/dashboard/accounts/${accountId}/reconnect`,
            trailing: ".",
          }}
        >
          <NavigationMenu>
            <MetadataRow
              label={t("Status")}
              value={needsReauth ? t("Needs Reauthentication") : t("Healthy")}
              tone={needsReauth ? "attention" : undefined}
              to={needsReauth ? `/dashboard/accounts/${accountId}/reconnect` : undefined}
            />
            <MetadataRow label={t("Resource Type")} value={t("Account")} />
            <MetadataRow label={t("Calendar Count")} value={String(calendars.length)} />
            <MetadataRow label={t("Identifier")} value={account.accountIdentifier ?? ""} truncate />
            <MetadataRow label={t("Provider")} value={account.providerName} />
            <MetadataRow label={t("Authenticated")} value={account.authType} />
            <MetadataRow label={t("Connected")} value={formatDate(account.createdAt, locale)} />
            {account.calendarsRefreshedAt && (
              <MetadataRow label={t("Calendars Checked")} value={formatDate(account.calendarsRefreshedAt, locale)} />
            )}
            <MetadataRow
              label={t("Last sync")}
              value={account.lastSyncedAt ? formatTimeUntil(new Date(account.lastSyncedAt), locale) : t("Not synced yet")}
            />
          </NavigationMenu>
        </MenuGate>
        <NavigationMenu>
          <AccountColorItem accountId={accountId} />
        </NavigationMenu>
        <DashboardSection
          title={t("Account Calendars")}
          description={calendars.length === 1
            ? t("This account has {count} calendar attached to it, choose a calendar below to view more details and configure it. Calendars no longer found at the provider are noted below.", { count: calendars.length })
            : t("This account has {count} calendars attached to it, choose a calendar below to view more details and configure it. Calendars no longer found at the provider are noted below.", { count: calendars.length })}
        />
        <NavigationMenu>
          <CalendarList calendars={calendars} accountId={accountId} />
        </NavigationMenu>
        {canRefreshCalendars(account) && (
          <NavigationMenu>
            <RefreshCalendarsItem accountId={accountId} />
          </NavigationMenu>
        )}
        <NavigationMenu>
          <NavigationMenuButtonItem onClick={() => setDeleteOpen(true)}>
            <NavigationMenuItemIcon>
              <Trash2 size={15} className="text-destructive" />
            </NavigationMenuItemIcon>
            <Text size="sm" tone="danger">{t("Delete Account")}</Text>
          </NavigationMenuButtonItem>
        </NavigationMenu>
        {deleteError && <Text size="sm" tone="danger">{t(deleteError)}</Text>}
        <DeleteConfirmation
          title={t("Delete calendar account?")}
          description={t("This will remove the account and all its calendars. Any sync profiles using these calendars will be affected.")}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          deleting={isDeleting}
          onConfirm={handleConfirmDelete}
        />
      </PageBody>
    </div>
  );
}

function AccountColorItem({ accountId }: { accountId: string }) {
  const t = useT();
  const { mutate: globalMutate } = useSWRConfig();
  const { data: accounts } = useSWR<CalendarAccount[]>("/api/accounts");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const color = resolveAccountColors(accounts ?? []).get(accountId);
  if (!color) return null;

  const handleChange = (next: AccountColor) => {
    if (next === color) return;
    setError(null);
    startSaving(async () => {
      try {
        await apiFetch(`/api/accounts/${accountId}`, {
          body: JSON.stringify({ color: next }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });
        await Promise.all([globalMutate("/api/accounts"), globalMutate(`/api/accounts/${accountId}`)]);
      } catch (err) {
        setError(resolveErrorMessage(err, msg("The color couldn't be saved. Try again.")));
      }
    });
  };

  return (
    <>
      <NavigationMenuItem>
        <NavigationMenuItemIcon>
          <Palette size={15} />
        </NavigationMenuItemIcon>
        <NavigationMenuItemLabel>{t("Color")}</NavigationMenuItemLabel>
        <NavigationMenuItemTrailing>
          <AccountColorPicker value={color} disabled={isSaving} onChange={handleChange} />
        </NavigationMenuItemTrailing>
      </NavigationMenuItem>
      {error && <Text size="sm" tone="danger">{t(error)}</Text>}
    </>
  );
}

function AccountPrevNext({ accountId }: { accountId: string }) {
  const { data: accounts } = useSWR<CalendarAccount[]>("/api/accounts");

  const currentIndex = useMemo(
    () => (accounts ?? []).findIndex((a) => a.id === accountId),
    [accounts, accountId],
  );

  const prev = accounts && currentIndex > 0 ? accounts[currentIndex - 1] : null;
  const next = accounts && currentIndex < accounts.length - 1 ? accounts[currentIndex + 1] : null;

  useEffect(() => {
    if (prev) preload(`/api/accounts/${prev.id}`, fetcher);
    if (next) preload(`/api/accounts/${next.id}`, fetcher);
  }, [prev, next]);

  if (!accounts || accounts.length <= 1) return null;

  return (
    <Pagination>
      <PaginationPrevious to={prev ? `/dashboard/accounts/${prev.id}` : undefined} />
      <PaginationNext to={next ? `/dashboard/accounts/${next.id}` : undefined} />
    </Pagination>
  );
}
