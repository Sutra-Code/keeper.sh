import { translate, type Translate } from "@/i18n";
import type { CompositeSyncState } from "@/state/sync";

interface CopyProgress {
  remaining: number;
  secondsRemaining: number | null;
  total: number;
}

type CopyProgressSignal = Pick<
  CompositeSyncState,
  "syncEventsRemaining" | "syncEventsTotal" | "syncSecondsRemaining"
>;

const SECONDS_PER_MINUTE = 60;

const inEnglish: Translate = (text, values) => translate("en", text, values);

const isSameProgress = (first: CopyProgress, second: CopyProgress): boolean =>
  first.remaining === second.remaining
  && first.total === second.total
  && first.secondsRemaining === second.secondsRemaining;

const advanceCopyProgress = (
  previous: CopyProgress | null,
  signal: CopyProgressSignal,
): CopyProgress | null => {
  if (signal.syncEventsTotal === 0) return previous;
  const next: CopyProgress = {
    remaining: signal.syncEventsRemaining,
    secondsRemaining: signal.syncSecondsRemaining,
    total: Math.max(previous?.total ?? 0, signal.syncEventsTotal),
  };
  if (previous && isSameProgress(previous, next)) return previous;
  return next;
};

const resolveCopyPercent = (progress: CopyProgress | null): number | null => {
  if (!progress || progress.total === 0) return null;
  return ((progress.total - progress.remaining) / progress.total) * 100;
};

const describeRemainingEvents = (progress: CopyProgress | null, t: Translate = inEnglish): string => {
  if (!progress || progress.remaining === 0) return t("Copying");
  if (progress.remaining === 1) return t("1 more event");
  return t("{count} more events", { count: progress.remaining.toLocaleString() });
};

const describeTimeLeft = (secondsRemaining: number | null, t: Translate = inEnglish): string | null => {
  if (secondsRemaining === null) return null;
  if (secondsRemaining < SECONDS_PER_MINUTE) return t("Less than a minute left.");
  const minutes = Math.round(secondsRemaining / SECONDS_PER_MINUTE);
  if (minutes === 1) return t("About 1 minute left.");
  return t("About {count} minutes left.", { count: minutes.toLocaleString() });
};

export { advanceCopyProgress, describeRemainingEvents, describeTimeLeft, resolveCopyPercent };
export type { CopyProgress, CopyProgressSignal };
