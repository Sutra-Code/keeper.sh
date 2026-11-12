import { use, useEffect, useMemo, useState, useTransition } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import useSWR, { preload, useSWRConfig } from "swr";
import CheckIcon from "lucide-react/dist/esm/icons/check";
import { useAtomValue, useStore } from "jotai";
import {
  MAX_EXCLUDE_TITLE_KEYWORDS,
  MAX_EXCLUDE_TITLE_KEYWORD_LENGTH,
  getExcludableAvailabilities,
} from "@keeper.sh/data-schemas";
import type { ExcludableAvailability, SyncRange } from "@keeper.sh/data-schemas";
import { useEntitlements, canAddMore } from "@/hooks/use-entitlements";
import { useMappingToggles } from "@/hooks/use-mapping-toggles";
import { BackButton } from "@/components/ui/primitives/back-button";
import { PageBody } from "@/components/ui/primitives/page-body";
import { StickyPageHeader } from "@/components/ui/primitives/sticky-page-header";
import TriangleAlert from "lucide-react/dist/esm/icons/triangle-alert";
import { MenuHint, PremiumHint, PremiumGate } from "@/components/ui/primitives/menu-hint";
import { Pagination, PaginationPrevious, PaginationNext } from "@/components/ui/primitives/pagination";
import { RouteShell } from "@/components/ui/shells/route-shell";
import { useReauthAccounts } from "@/features/dashboard/components/reauth/use-reauth-accounts";
import { MetadataRow } from "@/features/dashboard/components/metadata-row";
import { ProviderIcon } from "@/components/ui/primitives/provider-icon";
import { DashboardHeading1, DashboardSection } from "@/components/ui/primitives/dashboard-heading";
import { apiFetch, fetcher } from "@/lib/fetcher";
import { track, ANALYTICS_EVENTS } from "@/lib/analytics";
import { serializedPatch } from "@/lib/serialized-mutate";
import { invalidateAccountsAndSources } from "@/lib/swr";
import { formatDate } from "@/lib/time";
import { resolveErrorMessage } from "@/utils/errors";
import {
  areTitleKeywordsEqual,
  canPull,
  canPush,
  formatTitleKeywords,
  isMissingAtProvider,
  parseTitleKeywords,
  toggleExcludedAvailability,
} from "@/utils/calendars";
import type { CalendarAccount, CalendarDetail, CalendarSource } from "@/types/api";
import {
  NavigationMenu,
  NavigationMenuButtonItem,
  NavigationMenuEmptyItem,
  NavigationMenuItemIcon,
  NavigationMenuLinkItem,
  NavigationMenuItemLabel,
  NavigationMenuItemTrailing,
} from "@/components/ui/composites/navigation-menu/navigation-menu-items";
import { NavigationMenuPopover } from "@/components/ui/composites/navigation-menu/navigation-menu-popover";
import {
  NavigationMenuEditableItem,
  NavigationMenuEditableTemplateItem,
} from "@/components/ui/composites/navigation-menu/navigation-menu-editable";
import { MenuVariantContext, ItemDisabledContext, usePopover } from "@/components/ui/composites/navigation-menu/navigation-menu.contexts";
import {
  DISABLED_LABEL_TONE,
  LABEL_TONE,
  navigationMenuItemStyle,
  navigationMenuCheckbox,
  navigationMenuCheckboxIcon,
  navigationMenuToggleTrack,
  navigationMenuToggleThumb,
} from "@/components/ui/composites/navigation-menu/navigation-menu.styles";
import { Text } from "@/components/ui/primitives/text";
import { TemplateText } from "@/components/ui/primitives/template-text";
import { DeleteConfirmation } from "@/components/ui/primitives/delete-confirmation";
import {
  calendarDetailAtom,
  calendarDetailLoadedAtom,
  calendarDetailErrorAtom,
  calendarNameAtom,
  calendarProviderAtom,
  calendarMissingSinceAtom,
  calendarTypeAtom,
  customEventNameAtom,
  excludeAvailabilitiesAtom,
  excludeEventNameAtom,
  excludeFieldAtoms,
  excludeTitleKeywordsAtom,
  treatFullDayTimedEventsAsAllDayAtom,
} from "@/state/calendar-detail";
import type { ExcludeField } from "@/state/calendar-detail";
import {
  destinationIdsAtom,
  selectDestinationInclusion,
} from "@/state/destination-ids";
import {
  getSyncRangeLabel,
  SYNC_RANGE_OPTIONS,
} from "@/features/dashboard/components/sync-range-options";
import { msg, rich, useLocale, useT } from "@/i18n";


export const Route = createFileRoute(
  "/(dashboard)/dashboard/accounts/$accountId/$calendarId",
)({
  component: CalendarDetailPage,
});

interface SyncSetting {
  field: ExcludeField;
  label: string;
  matchesField: boolean;
}

const SYNC_SETTINGS: SyncSetting[] = [
  { field: "excludeEventDescription", label: msg("Sync Event Description"), matchesField: false },
  { field: "excludeEventLocation", label: msg("Sync Event Location"), matchesField: false },
  { field: "markEventsAsPrivate", label: msg("Mark Events as Private"), matchesField: true },
  { field: "disableEventReminders", label: msg("Disable Reminders"), matchesField: true },
];

const EXCLUSION_SETTINGS: SyncSetting[] = [
  { field: "excludeAllDayEvents", label: msg("Exclude All Day Events"), matchesField: true },
];

const PROVIDER_EXCLUSION_SETTINGS: SyncSetting[] = [
  { field: "excludeFocusTime", label: msg("Exclude Focus Time Events"), matchesField: true },
  { field: "excludeOutOfOffice", label: msg("Exclude Out of Office Events"), matchesField: true },
];

const PROVIDERS_WITH_EXTRA_SETTINGS = new Set(["google"]);

function patchSource(
  store: ReturnType<typeof useStore>,
  calendarId: string,
  patch: Record<string, unknown>,
) {
  const swrKey = `/api/sources/${calendarId}`;
  serializedPatch(
    swrKey,
    patch,
    (mergedPatch) => {
      return apiFetch(swrKey, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedPatch),
      });
    },
    () => {
      fetcher<CalendarDetail>(swrKey).then((serverState) => {
        store.set(calendarDetailAtom, serverState);
      });
    },
  );
}

function useSeedCalendarDetail(calendarId: string, calendar: CalendarDetail | undefined) {
  const store = useStore();

  useEffect(() => {
    if (!calendar) return;
    if (store.get(calendarDetailLoadedAtom) === calendarId) return;

    store.set(calendarDetailAtom, calendar);
    store.set(calendarDetailLoadedAtom, calendarId);
    store.set(calendarDetailErrorAtom, null);
  }, [calendarId, calendar, store]);
}

function CalendarDetailPage() {
  const t = useT();
  const { accountId, calendarId } = Route.useParams();
  const { data: account, isLoading: accountLoading, error: accountError, mutate: mutateAccount } = useSWR<CalendarAccount>(`/api/accounts/${accountId}`);
  const { data: calendar, isLoading: calendarLoading, error: calendarError } = useSWR<CalendarDetail>(`/api/sources/${calendarId}`);
  const { mutate: mutateCalendar } = useSWRConfig();

  useSeedCalendarDetail(calendarId, calendar);

  const isLoading = accountLoading || calendarLoading;
  const error = accountError || calendarError;

  if (error || isLoading || !account || !calendar) {
    if (error) return <RouteShell backFallback={`/dashboard/accounts/${accountId}`} status="error" onRetry={async () => { await Promise.all([mutateAccount(), mutateCalendar(`/api/sources/${calendarId}`)]); }} />;
    return <RouteShell backFallback={`/dashboard/accounts/${accountId}`} status="loading" />;
  }

  const isPullCapable = canPull(calendar);
  const isPushCapable = canPush(calendar);
  const isRemovable = !isPushCapable || isMissingAtProvider(calendar);

  return (
    <div className="flex flex-col gap-1.5 lg:h-full">
      <StickyPageHeader className="gap-1.5">
        <div className="flex items-center justify-between">
          <BackButton fallback={`/dashboard/accounts/${accountId}`} />
          <CalendarPrevNext calendarId={calendarId} />
        </div>
        <CalendarHeader account={account} />
      </StickyPageHeader>
      <PageBody className="gap-1.5">
        <ReauthNotice account={account} />
        <ProviderMissingNotice />
        <RenameSection calendarId={calendarId} />
        {isPullCapable && (
          <>
            <DashboardSection
              title={t("Send Events to Calendars")}
              description={t("Select which calendars should receive events from this calendar.")}
            />
            <DestinationsSection calendarId={calendarId} />
          </>
        )}
        {isPushCapable && <SyncWindowSection calendarId={calendarId} />}
        {isPullCapable && <SyncSettingsSection calendarId={calendarId} />}
        {isPullCapable && <ExclusionsSection calendarId={calendarId} provider={calendar.provider} />}
        <CalendarInfoSection account={account} accountId={accountId} />
        {isRemovable && <DeleteCalendarSection accountId={accountId} calendarId={calendarId} />}
      </PageBody>
    </div>
  );
}

type SyncRangeField = "syncHistoricRange" | "syncFutureRange";

function SyncWindowSection({ calendarId }: { calendarId: string }) {
  const t = useT();
  const { data: entitlements } = useEntitlements();
  const locked = Boolean(entitlements && !entitlements.canUseEventFilters);
  const disabled = !entitlements || locked;

  return (
    <>
      <DashboardSection
        title={t("Sync Window")}
        description={t("Choose how far back and ahead SutraCode Calendar syncs events into this calendar. Narrowing a range removes already-synced events outside it from this calendar.")}
      />
      <PremiumGate locked={locked} hint={t("Custom sync windows are a Pro feature.")}>
        <NavigationMenu>
          <SyncRangeItem
            calendarId={calendarId}
            field="syncHistoricRange"
            label={t("Sync Historic Events")}
            locked={disabled}
          />
          <SyncRangeItem
            calendarId={calendarId}
            field="syncFutureRange"
            label={t("Sync Future Events")}
            locked={disabled}
          />
        </NavigationMenu>
      </PremiumGate>
    </>
  );
}

function SyncRangeItem({
  calendarId,
  field,
  label,
  locked,
}: {
  calendarId: string;
  field: SyncRangeField;
  label: string;
  locked: boolean;
}) {
  const t = useT();
  const store = useStore();
  const calendar = useAtomValue(calendarDetailAtom);
  const loadedCalendarId = useAtomValue(calendarDetailLoadedAtom);

  if (!calendar || loadedCalendarId !== calendarId) {
    return null;
  }

  const selectedRange = calendar[field];

  const selectRange = (range: SyncRange) => {
    if (locked || range === selectedRange) {
      return;
    }

    track(ANALYTICS_EVENTS.calendar_setting_toggled, { field, value: range });
    store.set(calendarDetailAtom, (previous) => (
      previous ? { ...previous, [field]: range } : previous
    ));
    patchSource(store, calendarId, { [field]: range });
  };

  return (
    <NavigationMenuPopover
      disabled={locked}
      trigger={
        <>
          <NavigationMenuItemLabel>{label}</NavigationMenuItemLabel>
          <NavigationMenuItemTrailing>
            <Text size="sm" tone={locked ? "disabled" : "muted"}>
              {t(getSyncRangeLabel(selectedRange))}
            </Text>
          </NavigationMenuItemTrailing>
        </>
      }
    >
      {SYNC_RANGE_OPTIONS.map((option) => (
        <SyncRangeOptionItem
          key={option.value}
          option={option}
          selected={option.value === selectedRange}
          onSelect={selectRange}
        />
      ))}
    </NavigationMenuPopover>
  );
}

function SyncRangeOptionItem({
  option,
  selected,
  onSelect,
}: {
  option: (typeof SYNC_RANGE_OPTIONS)[number];
  selected: boolean;
  onSelect: (range: SyncRange) => void;
}) {
  const t = useT();
  const { close } = usePopover();

  return (
    <NavigationMenuButtonItem
      onClick={() => {
        onSelect(option.value);
        close();
      }}
    >
      <NavigationMenuItemLabel>{t(option.label)}</NavigationMenuItemLabel>
      <NavigationMenuItemTrailing>
        {selected && <CheckIcon size={14} />}
      </NavigationMenuItemTrailing>
    </NavigationMenuButtonItem>
  );
}

function CalendarPrevNext({ calendarId }: { calendarId: string }) {
  const { data: allCalendars } = useSWR<CalendarSource[]>("/api/sources");
  const calendars = allCalendars ?? [];

  const currentIndex = calendars.findIndex((c) => c.id === calendarId);
  const prev = currentIndex > 0 ? calendars[currentIndex - 1] : null;
  const next = currentIndex < calendars.length - 1 ? calendars[currentIndex + 1] : null;

  useEffect(() => {
    if (prev) preload(`/api/sources/${prev.id}`, fetcher);
    if (next) preload(`/api/sources/${next.id}`, fetcher);
  }, [prev, next]);

  const toCalendar = (c: CalendarSource) => `/dashboard/accounts/${c.accountId}/${c.id}`;

  return (
    <Pagination>
      <PaginationPrevious to={prev ? toCalendar(prev) : undefined} />
      <PaginationNext to={next ? toCalendar(next) : undefined} />
    </Pagination>
  );
}

function CalendarHeader({ account }: { account: CalendarAccount }) {
  const provider = useAtomValue(calendarProviderAtom);
  const calendarType = useAtomValue(calendarTypeAtom);

  return (
    <div className="flex flex-col px-0.5 pt-4">
      <CalendarTitle />
      <div className="flex items-center gap-1.5 pt-0.5">
        <ProviderIcon provider={provider} calendarType={calendarType} size={14} />
        <Text className="truncate overflow-hidden" size="sm" tone="muted">{account.accountLabel}</Text>
      </div>
    </div>
  );
}

function CalendarTitle() {
  const name = useAtomValue(calendarNameAtom);
  return <DashboardHeading1 className="select-none">{name}</DashboardHeading1>;
}

function RenameSection({ calendarId }: { calendarId: string }) {
  const t = useT();

  return (
    <>
      <DashboardSection
        title={t("Calendar Name")}
        description={t("Click below to rename the calendar within SutraCode Calendar. This does not affect the calendar outside of the SutraCode Calendar ecosystem.")}
      />
      <NavigationMenu>
        <RenameItem calendarId={calendarId} />
      </NavigationMenu>
    </>
  );
}

function RenameItem({ calendarId }: { calendarId: string }) {
  const store = useStore();
  const name = useAtomValue(calendarNameAtom);

  return (
    <NavigationMenuEditableItem
      value={name}
      onCommit={(newName) => {
        track(ANALYTICS_EVENTS.calendar_renamed);
        store.set(calendarDetailAtom, (prev) => (prev ? { ...prev, name: newName } : prev));
        patchSource(store, calendarId, { name: newName });
      }}
    >
      <RenameItemValue />
    </NavigationMenuEditableItem>
  );
}

function RenameItemValue() {
  const name = useAtomValue(calendarNameAtom);
  const variant = use(MenuVariantContext);
  const disabled = use(ItemDisabledContext);

  return (
    <Text
      size="sm"
      tone={(disabled ? DISABLED_LABEL_TONE : LABEL_TONE)[variant ?? "default"]}
      className="min-w-0 truncate"
    >
      {name}
    </Text>
  );
}

/** Leads the page when the owning account has lost authorization; this calendar cannot sync until it is restored. */
function ReauthNotice({ account }: { account: CalendarAccount }) {
  const t = useT();
  const needsReauth = useReauthAccounts().some((entry) => entry.id === account.id);
  if (!needsReauth) return null;

  return (
    <>
      <NavigationMenu variant="attention">
        <NavigationMenuLinkItem to={`/dashboard/accounts/${account.id}/reconnect`}>
          <NavigationMenuItemIcon>
            <TriangleAlert size={15} />
          </NavigationMenuItemIcon>
          <NavigationMenuItemLabel>{t("Reconnect 1 Account")}</NavigationMenuItemLabel>
          <NavigationMenuItemTrailing />
        </NavigationMenuLinkItem>
      </NavigationMenu>
      <MenuHint>
        {t("Authorization for this account has been lost. This calendar will drift out of date until access is restored.")}
      </MenuHint>
    </>
  );
}

function ProviderMissingNotice() {
  const t = useT();
  const locale = useLocale();
  const missingSince = useAtomValue(calendarMissingSinceAtom);
  if (!missingSince) return null;

  return (
    <Text size="sm" tone="danger" className="px-0.5">
      {t("This calendar could not be found at the provider (since {date}) - it may have been deleted or renamed there. Refresh the connection to check again, or remove the calendar below.", {
        date: formatDate(missingSince, locale),
      })}
    </Text>
  );
}

function DeleteCalendarSection({ accountId, calendarId }: { accountId: string; calendarId: string }) {
  const t = useT();
  const { mutate: globalMutate } = useSWRConfig();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirmDelete = () => {
    setDeleteError(null);

    startDeleteTransition(async () => {
      try {
        await apiFetch(`/api/sources/${calendarId}`, { method: "DELETE" });
        track(ANALYTICS_EVENTS.source_calendar_deleted);
        await invalidateAccountsAndSources(globalMutate, `/api/accounts/${accountId}`);
        navigate({ to: `/dashboard/accounts/${accountId}` });
      } catch (err) {
        setDeleteError(resolveErrorMessage(err, msg("Failed to delete calendar.")));
      }
    });
  };

  return (
    <>
      <DashboardSection
        title={t("Remove Calendar")}
        description={t("Stop syncing this calendar and remove it from SutraCode Calendar. It will not be imported again when the account's calendars are refreshed.")}
      />
      <NavigationMenu>
        <NavigationMenuButtonItem onClick={() => setDeleteOpen(true)}>
          <Text size="sm" tone="danger">{t("Delete Calendar")}</Text>
        </NavigationMenuButtonItem>
      </NavigationMenu>
      {deleteError && <Text size="sm" tone="danger" className="px-0.5">{t(deleteError)}</Text>}
      <DeleteConfirmation
        title={t("Delete this calendar?")}
        description={t("This removes the calendar and its sync history from SutraCode Calendar. Any sync profiles using it will be affected.")}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        deleting={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

function DestinationsSeed({ calendarId }: { calendarId: string }) {
  const { data } = useSWR<{ destinationIds: string[] }>(
    `/api/sources/${calendarId}/destinations`,
  );
  const store = useStore();

  useEffect(() => {
    store.set(destinationIdsAtom, new Set(data?.destinationIds));
  }, [calendarId, data, store]);

  return null;
}

function DestinationsSection({ calendarId }: { calendarId: string }) {
  const t = useT();
  const { data: allCalendars } = useSWR<CalendarSource[]>("/api/sources");
  const { data: entitlements } = useEntitlements();
  const atLimit = !canAddMore(entitlements?.mappings);

  const pushCalendars = useMemo(
    () => (allCalendars ?? []).filter((calendar) => canPush(calendar) && calendar.id !== calendarId),
    [allCalendars, calendarId],
  );

  return (
    <>
      <DestinationsSeed calendarId={calendarId} />
      <NavigationMenu>
        {pushCalendars.length === 0 ? (
          <NavigationMenuEmptyItem>{t("No destination calendars available")}</NavigationMenuEmptyItem>
        ) : (
          pushCalendars.map((calendar) => (
            <DestinationCheckboxItem
              key={calendar.id}
              calendarId={calendarId}
              destinationId={calendar.id}
              name={calendar.name}
              provider={calendar.provider}
              calendarType={calendar.calendarType}
            />
          ))
        )}
      </NavigationMenu>
      {atLimit && <PremiumHint>{t("Mapping limit reached.")}</PremiumHint>}
    </>
  );
}

function DestinationCheckboxItem({
  calendarId,
  destinationId,
  name,
  provider,
  calendarType,
}: {
  calendarId: string;
  destinationId: string;
  name: string;
  provider: string;
  calendarType: string;
}) {
  const store = useStore();
  const variant = use(MenuVariantContext);
  const { data: entitlements } = useEntitlements();
  const { toggle } = useMappingToggles(calendarId, "destinations");

  const checkedAtom = useMemo(() => selectDestinationInclusion(destinationId), [destinationId]);
  const checked = useAtomValue(checkedAtom);
  const atLimit = !canAddMore(entitlements?.mappings);
  const disabled = atLimit && !checked;

  const handleClick = () => {
    if (disabled) return;

    const willCheck = !store.get(destinationIdsAtom).has(destinationId);
    track(ANALYTICS_EVENTS.destination_toggled, { enabled: willCheck });
    toggle(destinationId, willCheck);
  };

  return (
    <li>
      <ItemDisabledContext value={disabled}>
        <button
          type="button"
          role="checkbox"
          disabled={disabled}
          onClick={handleClick}
          className={navigationMenuItemStyle({ variant, interactive: !disabled })}
        >
          <NavigationMenuItemIcon>
            <ProviderIcon provider={provider} calendarType={calendarType} />
          </NavigationMenuItemIcon>
          <NavigationMenuItemLabel>{name}</NavigationMenuItemLabel>
          <DestinationCheckboxIndicator destinationId={destinationId} />
        </button>
      </ItemDisabledContext>
    </li>
  );
}

function DestinationCheckboxIndicator({ destinationId }: { destinationId: string }) {
  const checkedAtom = useMemo(() => selectDestinationInclusion(destinationId), [destinationId]);
  const checked = useAtomValue(checkedAtom);
  const variant = use(MenuVariantContext);

  return (
    <div className={navigationMenuCheckbox({ variant, checked, className: "ml-auto" })}>
      {checked && <CheckIcon size={12} className={navigationMenuCheckboxIcon({ variant })} />}
    </div>
  );
}

function SyncSettingsSection({ calendarId }: { calendarId: string }) {
  const t = useT();
  const { data: entitlements } = useEntitlements();
  const locked = Boolean(entitlements && !entitlements.canUseEventFilters);
  const calendarType = useAtomValue(calendarTypeAtom);

  return (
    <>
      <DashboardSection
        title={t("Sync Settings")}
        description={rich(t("Choose which event details are synced to destination calendars. Use <var>{{calendar_name}}</var> or <var>{{event_name}}</var> in text fields for dynamic values."), {
          var: (chunk) => <Text key={chunk} as="span" size="sm" className="text-template inline">{chunk}</Text>,
        })}
      />
      <PremiumGate locked={locked} hint={t("Advanced sync settings are a Pro feature.")}>
        <NavigationMenu>
          <SyncEventNameTemplateItem calendarId={calendarId} locked={locked} />
          <SyncEventNameToggle calendarId={calendarId} locked={locked} />
          <ProviderSyncSettings calendarId={calendarId} calendarType={calendarType} locked={locked} />
          {SYNC_SETTINGS.map((setting) => (
            <ExcludeFieldToggle
              key={setting.field}
              calendarId={calendarId}
              field={setting.field}
              label={t(setting.label)}
              matchesField={setting.matchesField}
              locked={locked}
            />
          ))}
        </NavigationMenu>
      </PremiumGate>
    </>
  );
}

function ProviderSyncSettings({
  calendarId,
  calendarType,
  locked,
}: {
  calendarId: string;
  calendarType: string;
  locked: boolean;
}) {
  switch (calendarType) {
    case "ical":
      return <TreatFullDayTimedEventsToggle calendarId={calendarId} locked={locked} />;
    default:
      return null;
  }
}

function TreatFullDayTimedEventsToggle({ calendarId, locked }: { calendarId: string; locked: boolean }) {
  const t = useT();
  const store = useStore();
  const variant = use(MenuVariantContext);

  const handleClick = () => {
    if (locked) return;
    const current = store.get(calendarDetailAtom);
    if (!current) return;

    const treatFullDayTimedEventsAsAllDay = !current.treatFullDayTimedEventsAsAllDay;
    track(ANALYTICS_EVENTS.calendar_setting_toggled, {
      field: "treatFullDayTimedEventsAsAllDay",
      enabled: treatFullDayTimedEventsAsAllDay,
    });
    store.set(calendarDetailAtom, (prev) => {
      if (!prev) {
        return prev;
      }
      return { ...prev, treatFullDayTimedEventsAsAllDay };
    });
    patchSource(store, calendarId, { treatFullDayTimedEventsAsAllDay });
  };

  return (
    <li>
      <ItemDisabledContext value={locked}>
        <button
          type="button"
          role="switch"
          disabled={locked}
          onClick={handleClick}
          className={navigationMenuItemStyle({ variant, interactive: !locked })}
        >
          <NavigationMenuItemLabel>{t("Sync Full-Day Events as All-Day")}</NavigationMenuItemLabel>
          <TreatFullDayTimedEventsToggleIndicator disabled={locked} />
        </button>
      </ItemDisabledContext>
    </li>
  );
}

function TreatFullDayTimedEventsToggleIndicator({ disabled }: { disabled: boolean }) {
  const checked = useAtomValue(treatFullDayTimedEventsAsAllDayAtom);
  const variant = use(MenuVariantContext);

  return (
    <div className={navigationMenuToggleTrack({ variant, checked, disabled, className: "ml-auto" })}>
      <div className={navigationMenuToggleThumb({ variant, checked })} />
    </div>
  );
}

function SyncEventNameDisabledProvider({ locked, children }: { locked: boolean; children: React.ReactNode }) {
  const excludeEventName = useAtomValue(excludeEventNameAtom);
  return <ItemDisabledContext value={locked || !excludeEventName}>{children}</ItemDisabledContext>;
}

function SyncEventNameTemplateItem({ calendarId, locked }: { calendarId: string; locked: boolean }) {
  const t = useT();
  const store = useStore();
  const customEventName = useAtomValue(customEventNameAtom);

  return (
    <SyncEventNameDisabledProvider locked={locked}>
      <NavigationMenuEditableTemplateItem
        label={t("Event Name")}
        disabled={locked}
        value={customEventName || "{{event_name}}"}
        renderInput={(live) => (
          <SyncEventNameTemplateInput template={live} />
        )}
        onCommit={(customEventName) => {
          store.set(calendarDetailAtom, (prev) => (prev ? { ...prev, customEventName } : prev));
          patchSource(store, calendarId, { customEventName });
        }}
      >
        <SyncEventNameTemplateValue />
      </NavigationMenuEditableTemplateItem>
    </SyncEventNameDisabledProvider>
  );
}

function SyncEventNameTemplateInput({ template }: { template: string }) {
  return <TemplateText template={template} variables={TEMPLATE_VARIABLES} />;
}

const TEMPLATE_VARIABLES = { calendar_name: "Calendar Name", event_name: "Event Name" };

function SyncEventNameTemplateValue() {
  const customEventName = useAtomValue(customEventNameAtom);
  const excludeEventName = useAtomValue(excludeEventNameAtom);
  const disabled = !excludeEventName;
  const template = customEventName || "{{event_name}}";

  return (
    <Text
      size="sm"
      tone={disabled ? "disabled" : "muted"}
      className="min-w-0 truncate flex-1 text-right"
    >
      <TemplateText
        template={template}
        variables={TEMPLATE_VARIABLES}
        disabled={disabled}
      />
    </Text>
  );
}

function SyncEventNameToggle({ calendarId, locked }: { calendarId: string; locked: boolean }) {
  const t = useT();
  const store = useStore();
  const variant = use(MenuVariantContext);

  const handleClick = () => {
    if (locked) return;
    const current = store.get(calendarDetailAtom);
    if (!current) return;

    const patch = current.excludeEventName
      ? { excludeEventName: false, customEventName: "{{event_name}}" }
      : { excludeEventName: true, customEventName: "{{calendar_name}}" };

    track(ANALYTICS_EVENTS.calendar_setting_toggled, { field: "excludeEventName", enabled: !current.excludeEventName });
    store.set(calendarDetailAtom, (prev) => (prev ? { ...prev, ...patch } : prev));
    patchSource(store, calendarId, patch);
  };

  return (
    <li>
      <ItemDisabledContext value={locked}>
        <button
          type="button"
          role="switch"
          disabled={locked}
          onClick={handleClick}
          className={navigationMenuItemStyle({ variant, interactive: !locked })}
        >
          <NavigationMenuItemLabel>{t("Sync Event Name")}</NavigationMenuItemLabel>
          <SyncEventNameToggleIndicator disabled={locked} />
        </button>
      </ItemDisabledContext>
    </li>
  );
}

function SyncEventNameToggleIndicator({ disabled }: { disabled: boolean }) {
  const excludeEventName = useAtomValue(excludeEventNameAtom);
  const variant = use(MenuVariantContext);
  const checked = !excludeEventName;

  return (
    <div className={navigationMenuToggleTrack({ variant, checked, disabled, className: "ml-auto" })}>
      <div className={navigationMenuToggleThumb({ variant, checked })} />
    </div>
  );
}

function ExclusionsSection({ calendarId, provider }: { calendarId: string; provider: string }) {
  const t = useT();
  const { data: entitlements } = useEntitlements();
  const locked = entitlements ? !entitlements.canUseEventFilters : false;
  const hasExtraSettings = PROVIDERS_WITH_EXTRA_SETTINGS.has(provider);
  const exclusionSettings = hasExtraSettings
    ? [...EXCLUSION_SETTINGS, ...PROVIDER_EXCLUSION_SETTINGS]
    : EXCLUSION_SETTINGS;

  return (
    <>
      <DashboardSection
        title={t("Exclusions")}
        description={t("Choose which events to exclude from syncing. Separate title keywords with commas. Up to {count} keywords of {length} characters each, matched ignoring case.", {
          count: MAX_EXCLUDE_TITLE_KEYWORDS,
          length: MAX_EXCLUDE_TITLE_KEYWORD_LENGTH,
        })}
      />
      <PremiumGate locked={locked} hint={t("Event exclusions are a Pro feature.")}>
        <NavigationMenu>
          {exclusionSettings.map((setting) => (
            <ExcludeFieldToggle
              key={setting.field}
              calendarId={calendarId}
              field={setting.field}
              label={t(setting.label)}
              matchesField={setting.matchesField}
              locked={locked}
            />
          ))}
          <ExcludeAvailabilitiesItem calendarId={calendarId} provider={provider} locked={locked} />
          <ExcludeTitleKeywordsItem calendarId={calendarId} locked={locked} />
        </NavigationMenu>
      </PremiumGate>
    </>
  );
}

function ExcludeAvailabilitiesItem({
  calendarId,
  provider,
  locked,
}: {
  calendarId: string;
  provider: string;
  locked: boolean;
}) {
  const t = useT();
  const store = useStore();
  const excluded = useAtomValue(excludeAvailabilitiesAtom);
  const options = getExcludableAvailabilities(provider);

  const toggleAvailability = (availability: ExcludableAvailability) => {
    if (locked) return;
    const excludeAvailabilities = toggleExcludedAvailability(excluded, availability);
    track(ANALYTICS_EVENTS.calendar_setting_toggled, {
      field: "excludeAvailabilities",
      value: availability,
      enabled: excludeAvailabilities.includes(availability),
    });
    store.set(calendarDetailAtom, (prev) => (prev ? { ...prev, excludeAvailabilities } : prev));
    patchSource(store, calendarId, { excludeAvailabilities });
  };

  const summary = options
    .filter(({ value }) => excluded.includes(value))
    .map(({ label }) => t(label))
    .join(", ");

  return (
    <NavigationMenuPopover
      disabled={locked}
      trigger={
        <>
          <NavigationMenuItemLabel>{t("Exclude by Status")}</NavigationMenuItemLabel>
          <NavigationMenuItemTrailing>
            <Text size="sm" tone={locked ? "disabled" : "muted"}>
              {summary || t("None")}
            </Text>
          </NavigationMenuItemTrailing>
        </>
      }
    >
      {options.map((option) => (
        <NavigationMenuButtonItem
          key={option.value}
          onClick={() => toggleAvailability(option.value)}
        >
          <NavigationMenuItemLabel>{t(option.label)}</NavigationMenuItemLabel>
          <NavigationMenuItemTrailing>
            {excluded.includes(option.value) && <CheckIcon size={14} />}
          </NavigationMenuItemTrailing>
        </NavigationMenuButtonItem>
      ))}
    </NavigationMenuPopover>
  );
}

function ExcludeTitleKeywordsItem({ calendarId, locked }: { calendarId: string; locked: boolean }) {
  const t = useT();
  const store = useStore();
  const keywords = useAtomValue(excludeTitleKeywordsAtom);

  return (
    <NavigationMenuEditableItem
      label={t("Exclude Titles Containing")}
      value={formatTitleKeywords(keywords)}
      disabled={locked}
      allowEmpty
      onCommit={(value) => {
        const excludeTitleKeywords = parseTitleKeywords(value);
        if (areTitleKeywordsEqual(excludeTitleKeywords, store.get(excludeTitleKeywordsAtom))) return;
        track(ANALYTICS_EVENTS.calendar_setting_toggled, {
          field: "excludeTitleKeywords",
          enabled: excludeTitleKeywords.length > 0,
        });
        store.set(calendarDetailAtom, (prev) => (prev ? { ...prev, excludeTitleKeywords } : prev));
        patchSource(store, calendarId, { excludeTitleKeywords });
      }}
    >
      <ExcludeTitleKeywordsValue />
    </NavigationMenuEditableItem>
  );
}

function ExcludeTitleKeywordsValue() {
  const t = useT();
  const keywords = useAtomValue(excludeTitleKeywordsAtom);
  const variant = use(MenuVariantContext);
  const disabled = use(ItemDisabledContext);

  return (
    <Text
      size="sm"
      tone={(disabled ? DISABLED_LABEL_TONE : LABEL_TONE)[variant ?? "default"]}
      className="min-w-0 flex-1 truncate text-right"
    >
      {keywords.length > 0 ? formatTitleKeywords(keywords) : t("None")}
    </Text>
  );
}

function ExcludeFieldToggle({
  calendarId,
  field,
  label,
  matchesField,
  locked = false,
}: {
  calendarId: string;
  field: ExcludeField;
  label: string;
  matchesField: boolean;
  locked?: boolean;
}) {
  const store = useStore();
  const variant = use(MenuVariantContext);

  const handleClick = () => {
    if (locked) return;
    const current = store.get(calendarDetailAtom);
    if (!current) return;

    const newValue = !current[field];
    track(ANALYTICS_EVENTS.calendar_setting_toggled, { field, enabled: newValue });
    store.set(calendarDetailAtom, (prev) => (prev ? { ...prev, [field]: newValue } : prev));
    patchSource(store, calendarId, { [field]: newValue });
  };

  return (
    <li>
      <ItemDisabledContext value={locked}>
        <button
          type="button"
          role="switch"
          disabled={locked}
          onClick={handleClick}
          className={navigationMenuItemStyle({ variant, interactive: !locked })}
        >
          <NavigationMenuItemLabel>{label}</NavigationMenuItemLabel>
          <ExcludeFieldToggleIndicator field={field} matchesField={matchesField} disabled={locked} />
        </button>
      </ItemDisabledContext>
    </li>
  );
}

function ExcludeFieldToggleIndicator({ field, matchesField, disabled }: { field: ExcludeField; matchesField: boolean; disabled: boolean }) {
  const raw = useAtomValue(excludeFieldAtoms[field]);
  const variant = use(MenuVariantContext);
  const checked = matchesField ? raw : !raw;

  return (
    <div className={navigationMenuToggleTrack({ variant, checked, disabled, className: "ml-auto" })}>
      <div className={navigationMenuToggleThumb({ variant, checked })} />
    </div>
  );
}


function CalendarInfoSection({ account, accountId }: { account: CalendarAccount; accountId: string }) {
  const t = useT();
  const locale = useLocale();
  const calendar = useAtomValue(calendarDetailAtom);

  if (!calendar) return null;

  return (
    <>
      <DashboardSection
        title={t("Calendar Information")}
        description={t("View details about the calendar.")}
      />
      <NavigationMenu>
        <MetadataRow label={t("Resource Type")} value={t("Calendar")} />
        <MetadataRow label={t("Type")} value={calendar.calendarType} />
        <MetadataRow label={t("Capabilities")} value={calendar.capabilities.join(", ")} />
        {calendar.unavailableSince && (
          <MetadataRow
            label={t("Availability")}
            value={t("Unavailable since {date}", { date: formatDate(calendar.unavailableSince, locale) })}
            truncate
          />
        )}
        {calendar.originalName && (
          <MetadataRow label={t("Original Source Name")} value={calendar.originalName} truncate />
        )}
        {calendar.url && (
          <MetadataRow label={t("URL")} value={calendar.url} truncate />
        )}
        {calendar.calendarUrl && (
          <MetadataRow label={t("Calendar URL")} value={calendar.calendarUrl} truncate />
        )}
        <MetadataRow label={t("Added")} value={formatDate(calendar.createdAt, locale)} />
        <MetadataRow
          label={t("Account Identifier")}
          value={account.accountIdentifier ?? ""}
          truncate
          to={`/dashboard/accounts/${accountId}`}
        />
      </NavigationMenu>
    </>
  );
}
