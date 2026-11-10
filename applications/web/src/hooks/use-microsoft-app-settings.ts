import useSWR from "swr";
import { apiFetch, fetcher } from "@/lib/fetcher";

export interface StoredMicrosoftApp {
  key: string;
  label: string;
  tenantId: string;
  clientId: string;
  updatedAt: string;
  connectedAccounts: number;
}

interface MicrosoftAppSettings {
  apps: StoredMicrosoftApp[];
  encryptionReady: boolean;
}

export interface MicrosoftAppForm {
  key: string;
  label: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

const SETTINGS_URL = "/api/settings/microsoft-apps";

/** Answers 403 for anyone outside SETTINGS_ADMIN_USERNAMES, so the screen stays hidden. */
export const useMicrosoftAppSettings = () =>
  useSWR<MicrosoftAppSettings>(SETTINGS_URL, fetcher, { shouldRetryOnError: false });

export async function saveMicrosoftApp(form: MicrosoftAppForm): Promise<void> {
  await apiFetch(SETTINGS_URL, {
    body: JSON.stringify({
      clientId: form.clientId,
      clientSecret: form.clientSecret || null,
      key: form.key,
      label: form.label,
      tenantId: form.tenantId || null,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export async function deleteMicrosoftApp(key: string): Promise<void> {
  await apiFetch(`${SETTINGS_URL}/${encodeURIComponent(key)}`, { method: "DELETE" });
}
