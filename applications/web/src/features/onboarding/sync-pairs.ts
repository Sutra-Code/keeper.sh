import { translate, type Translate } from "@/i18n";

const inEnglish: Translate = (text, values) => translate("en", text, values);

interface MappingPair {
  sourceCalendarId: string;
  destinationCalendarId: string;
}

interface SyncPairSummary {
  key: string;
  label: string;
  sourceCalendarId: string;
  busyOnly: boolean;
}

interface NamedCalendar {
  name: string;
}

interface PairedCalendar extends NamedCalendar {
  excludeEventName: boolean;
}

interface SyncDirections<TCalendar extends NamedCalendar> {
  origin: TCalendar;
  destination: TCalendar;
  forward: boolean;
  backward: boolean;
}

const pairKey = ({ sourceCalendarId, destinationCalendarId }: MappingPair): string =>
  [sourceCalendarId, destinationCalendarId].sort().join(":");

const isReverseOf = (mapping: MappingPair) => (other: MappingPair): boolean =>
  other.sourceCalendarId === mapping.destinationCalendarId
  && other.destinationCalendarId === mapping.sourceCalendarId;

const describeSyncPairs = (
  mappings: MappingPair[],
  calendarsById: ReadonlyMap<string, PairedCalendar>,
  t: Translate = inEnglish,
): SyncPairSummary[] => {
  const summaries = new Map<string, SyncPairSummary>();

  for (const mapping of mappings) {
    const key = pairKey(mapping);
    const source = calendarsById.get(mapping.sourceCalendarId);
    const destination = calendarsById.get(mapping.destinationCalendarId);
    if (summaries.has(key) || !source || !destination) continue;

    const twoWay = mappings.some(isReverseOf(mapping));
    const senders = twoWay ? [source, destination] : [source];
    summaries.set(key, {
      busyOnly: senders.every(({ excludeEventName }) => excludeEventName),
      key,
      label: twoWay
        ? t("{first} and {second}", { first: source.name, second: destination.name })
        : t("{source} to {destination}", { destination: destination.name, source: source.name }),
      sourceCalendarId: mapping.sourceCalendarId,
    });
  }

  return [...summaries.values()];
};

const describeProposal = <TCalendar extends NamedCalendar>(
  { origin, destination, forward, backward }: SyncDirections<TCalendar>,
  t: Translate = inEnglish,
): string => {
  if (forward && backward) {
    return t("{first} and {second} will each show you as busy whenever the other has an event.", {
      first: origin.name,
      second: destination.name,
    });
  }
  if (forward) {
    return t("{shown} will show you as busy whenever {source} has an event.", {
      shown: destination.name,
      source: origin.name,
    });
  }
  return t("{shown} will show you as busy whenever {source} has an event.", {
    shown: origin.name,
    source: destination.name,
  });
};

export { describeProposal, describeSyncPairs };
export type { MappingPair, PairedCalendar, SyncDirections, SyncPairSummary };
