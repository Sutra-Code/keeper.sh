import useSWR from "swr";
import type { CalendarSource } from "@/types/api";
import { useT } from "@/i18n";
import { describeSyncPairs } from "./sync-pairs";
import type { MappingPair, SyncPairSummary } from "./sync-pairs";

interface SyncPairWithSource {
  pair: SyncPairSummary;
  source: CalendarSource;
}

export function useSyncPairs(calendars: CalendarSource[] | undefined): SyncPairWithSource[] {
  const t = useT();
  const { data } = useSWR<{ mappings: MappingPair[] }>("/api/mappings");
  if (!data || !calendars) return [];

  const calendarsById = new Map(calendars.map((calendar) => [calendar.id, calendar]));

  return describeSyncPairs(data.mappings, calendarsById, t).flatMap((pair) => {
    const source = calendarsById.get(pair.sourceCalendarId);
    if (!source) return [];
    return [{ pair, source }];
  });
}
