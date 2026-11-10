import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export interface MicrosoftApp {
  key: string;
  label: string;
}

/** The Microsoft app registrations configured on the server, one per tenant. */
export const useMicrosoftApps = (enabled: boolean) =>
  useSWR<MicrosoftApp[]>(enabled ? "/api/sources/outlook/apps" : null, fetcher);
