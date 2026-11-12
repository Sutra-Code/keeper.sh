import { useState } from "react";
import type { SubmitEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import Building2 from "lucide-react/dist/esm/icons/building-2";
import Plus from "lucide-react/dist/esm/icons/plus";
import { BackButton } from "@/components/ui/primitives/back-button";
import { Button, ButtonText } from "@/components/ui/primitives/button";
import { Input } from "@/components/ui/primitives/input";
import { Text } from "@/components/ui/primitives/text";
import { Heading2 } from "@/components/ui/primitives/heading";
import { ErrorState } from "@/components/ui/primitives/error-state";
import {
  NavigationMenu,
  NavigationMenuButtonItem,
  NavigationMenuItemIcon,
  NavigationMenuItemLabel,
  NavigationMenuItemTrailing,
} from "@/components/ui/composites/navigation-menu/navigation-menu-items";
import {
  deleteMicrosoftApp,
  saveMicrosoftApp,
  useMicrosoftAppSettings,
} from "@/hooks/use-microsoft-app-settings";
import type { MicrosoftAppForm, StoredMicrosoftApp } from "@/hooks/use-microsoft-app-settings";
import { resolveErrorMessage } from "@/utils/errors";
import { pluralize } from "@/lib/pluralize";
import { msg, rich, useLocale, useT } from "@/i18n";

export const Route = createFileRoute(
  "/(dashboard)/dashboard/settings/microsoft-apps",
)({
  component: MicrosoftAppsPage,
});

const EMPTY_FORM: MicrosoftAppForm = { clientId: "", clientSecret: "", key: "", label: "", tenantId: "" };

const toForm = (app: StoredMicrosoftApp): MicrosoftAppForm => ({
  clientId: app.clientId,
  clientSecret: "",
  key: app.key,
  label: app.label,
  tenantId: app.tenantId,
});

interface FieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
}

function Field({ label, hint, value, onChange, type = "text", disabled, required, autoComplete = "off" }: FieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <Text size="sm" align="left">{label}</Text>
      <Input
        type={type}
        value={value}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint && <Text size="xs" tone="muted" align="left">{hint}</Text>}
    </label>
  );
}

interface AppEditorProps {
  initial: MicrosoftAppForm;
  isNew: boolean;
  connectedAccounts: number;
  onDone: () => void;
}

function AppEditor({ initial, isNew, connectedAccounts, onDone }: AppEditorProps) {
  const t = useT();
  const { mutate } = useMicrosoftAppSettings();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = (field: keyof MicrosoftAppForm) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await saveMicrosoftApp(form);
      await mutate();
      onDone();
    } catch (saveError) {
      setError(resolveErrorMessage(saveError, msg("Could not save the app.")));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    try {
      await deleteMicrosoftApp(form.key);
      await mutate();
      onDone();
    } catch (deleteError) {
      setError(resolveErrorMessage(deleteError, msg("Could not delete the app.")));
    }
  };

  let secretHint = t("Leave empty to keep the saved secret.");
  if (isNew) {
    secretHint = t("The secret's Value from Entra, not its ID. It is stored encrypted.");
  }
  let deleteLabel = t("Delete");
  if (confirmDelete) {
    deleteLabel = connectedAccounts === 1
      ? t("Confirm: {count} account will stop syncing", { count: connectedAccounts })
      : t("Confirm: {count} accounts will stop syncing", { count: connectedAccounts });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-interactive-border p-4">
      <Field
        label={t("Key")}
        hint={t("Lowercase letters and digits, e.g. oriontek. It cannot change once accounts are connected.")}
        value={form.key}
        onChange={update("key")}
        disabled={!isNew}
        required
      />
      <Field label={t("Organization name")} value={form.label} onChange={update("label")} required />
      <Field
        label={t("Directory (tenant) ID")}
        hint={t("Empty for a multi-tenant app.")}
        value={form.tenantId}
        onChange={update("tenantId")}
      />
      <Field label={t("Application (client) ID")} value={form.clientId} onChange={update("clientId")} required />
      <Field
        label={t("Client secret")}
        hint={secretHint}
        type="password"
        autoComplete="new-password"
        value={form.clientSecret}
        onChange={update("clientSecret")}
        required={isNew}
      />
      {error && <Text size="sm" tone="danger" align="left">{t(error)}</Text>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving} className="grow justify-center">
          <ButtonText>{saving ? t("Saving…") : t("Save")}</ButtonText>
        </Button>
        <Button type="button" variant="elevated" onClick={onDone} className="justify-center">
          <ButtonText>{t("Cancel")}</ButtonText>
        </Button>
        {!isNew && (
          <Button type="button" variant="destructive" onClick={handleDelete} className="w-full justify-center">
            <ButtonText>{deleteLabel}</ButtonText>
          </Button>
        )}
      </div>
    </form>
  );
}

function MicrosoftAppsPage() {
  const t = useT();
  const locale = useLocale();
  const { data, error, mutate } = useMicrosoftAppSettings();
  const [editing, setEditing] = useState<string | null>(null);
  const apps = data?.apps ?? [];

  if (error) {
    return (
      <div className="flex flex-col gap-1.5">
        <BackButton fallback="/dashboard/settings" />
        <ErrorState message={t("Only a settings admin can manage Microsoft apps.")} onRetry={() => mutate()} />
      </div>
    );
  }

  const editingApp = apps.find((app) => app.key === editing);

  return (
    <div className="flex flex-col gap-3">
      <BackButton fallback="/dashboard/settings" />
      <div className="flex flex-col gap-1">
        <Heading2 as="h1">{t("Microsoft apps")}</Heading2>
        <Text size="sm" tone="muted" align="left">
          {rich(
            t("One Entra app registration per organization. Each needs the redirect URI <code>{uri}</code>.", {
              uri: `${globalThis.location?.origin ?? ""}/api/sources/callback/outlook`,
            }),
            { code: (chunk) => <code key="uri">{chunk}</code> },
          )}
        </Text>
      </div>
      {data && !data.encryptionReady && (
        <Text size="sm" tone="danger" align="left">{t("ENCRYPTION_KEY is not set, so secrets cannot be stored.")}</Text>
      )}
      <NavigationMenu>
        {apps.map((app) => (
          <NavigationMenuButtonItem key={app.key} onClick={() => setEditing(app.key)}>
            <NavigationMenuItemIcon>
              <Building2 size={15} />
            </NavigationMenuItemIcon>
            <NavigationMenuItemLabel>{app.label}</NavigationMenuItemLabel>
            <NavigationMenuItemTrailing>
              <Text size="sm" tone="muted">{pluralize(app.connectedAccounts, t("account"), t("accounts"), locale)}</Text>
            </NavigationMenuItemTrailing>
          </NavigationMenuButtonItem>
        ))}
        <NavigationMenuButtonItem onClick={() => setEditing("")}>
          <NavigationMenuItemIcon>
            <Plus size={15} />
          </NavigationMenuItemIcon>
          <NavigationMenuItemLabel>{t("Add organization")}</NavigationMenuItemLabel>
        </NavigationMenuButtonItem>
      </NavigationMenu>
      {editing === "" && (
        <AppEditor key="new" initial={EMPTY_FORM} isNew connectedAccounts={0} onDone={() => setEditing(null)} />
      )}
      {editingApp && (
        <AppEditor
          key={editingApp.key}
          initial={toForm(editingApp)}
          isNew={false}
          connectedAccounts={editingApp.connectedAccounts}
          onDone={() => setEditing(null)}
        />
      )}
    </div>
  );
}
