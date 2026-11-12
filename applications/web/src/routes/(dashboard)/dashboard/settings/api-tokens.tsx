import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import Check from "lucide-react/dist/esm/icons/check";
import Copy from "lucide-react/dist/esm/icons/copy";
import Bot from "lucide-react/dist/esm/icons/bot";
import Gauge from "lucide-react/dist/esm/icons/gauge";
import KeySquare from "lucide-react/dist/esm/icons/key-square";
import Plus from "lucide-react/dist/esm/icons/plus";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/primitives/button";
import { BackButton } from "@/components/ui/primitives/back-button";
import { Input } from "@/components/ui/primitives/input";
import {
  useApiTokens,
  createApiToken,
  deleteApiToken,
} from "@/hooks/use-api-tokens";
import { track, ANALYTICS_EVENTS } from "@/lib/analytics";
import type { ApiToken } from "@/hooks/use-api-tokens";
import { useEntitlements } from "@/hooks/use-entitlements";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalTitle,
} from "@/components/ui/primitives/modal";
import {
  NavigationMenu,
  NavigationMenuButtonItem,
  NavigationMenuItem,
  NavigationMenuItemIcon,
  NavigationMenuItemLabel,
  NavigationMenuItemTrailing,
} from "@/components/ui/composites/navigation-menu/navigation-menu-items";
import { ErrorState } from "@/components/ui/primitives/error-state";
import { Text } from "@/components/ui/primitives/text";
import { resolveErrorMessage } from "@/utils/errors";
import { msg, useT } from "@/i18n";

export const Route = createFileRoute(
  "/(dashboard)/dashboard/settings/api-tokens",
)({
  component: ApiTokensPage,
});

function CopyTokenIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return <Check size={16} />;
  }
  return <Copy size={16} />;
}

function resolveApiLimitLabel(plan: string | null): string {
  if (plan === "pro") {
    return msg("Unlimited");
  }
  return msg("25 calls/day");
}

function ApiTokensPage() {
  const t = useT();
  const { data: entitlements } = useEntitlements();
  const { data: tokens = [], error, mutate } = useApiTokens();
  const [deleteTarget, setDeleteTarget] = useState<ApiToken | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setDeleteTarget(null);
    setMutationError(null);
    try {
      await mutate(
        async (current) => {
          await deleteApiToken(targetId);
          return current?.filter((entry) => entry.id !== targetId) ?? [];
        },
        {
          optimisticData: tokens.filter((entry) => entry.id !== targetId),
          rollbackOnError: true,
          revalidate: false,
        },
      );
      track(ANALYTICS_EVENTS.api_token_deleted);
    } catch (err) {
      setMutationError(resolveErrorMessage(err, msg("Failed to delete token.")));
    }
  };

  const [mcpUrlCopied, setMcpUrlCopied] = useState(false);

  const handleCopy = async () => {
    if (!revealedToken) return;
    await navigator.clipboard.writeText(revealedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyMcpUrl = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/mcp`);
    setMcpUrlCopied(true);
    setTimeout(() => setMcpUrlCopied(false), 2000);
  };

  const handleCloseReveal = () => {
    setRevealedToken(null);
    setCopied(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <BackButton fallback="/dashboard/settings" />
      <NavigationMenu>
        <NavigationMenuItem>
          <NavigationMenuItemIcon>
            <Gauge size={15} />
          </NavigationMenuItemIcon>
          <NavigationMenuItemLabel>{t("Daily Limit")}</NavigationMenuItemLabel>
          <NavigationMenuItemTrailing>
            <Text size="sm" tone="muted">
              {t(resolveApiLimitLabel(entitlements?.plan ?? null))}
            </Text>
          </NavigationMenuItemTrailing>
        </NavigationMenuItem>
        <NavigationMenuButtonItem onClick={handleCopyMcpUrl}>
          <NavigationMenuItemIcon>
            <Bot size={15} />
          </NavigationMenuItemIcon>
          <NavigationMenuItemLabel>{t("MCP server for AI agents")}</NavigationMenuItemLabel>
          <NavigationMenuItemTrailing>
            <Text size="sm" tone="muted">
              {mcpUrlCopied ? t("Copied") : t("Copy URL")}
            </Text>
          </NavigationMenuItemTrailing>
        </NavigationMenuButtonItem>
      </NavigationMenu>
      <Text size="sm" tone="muted" className="px-2">
        {t("Give an AI agent the MCP server URL and one of these tokens as its Bearer token. The agent gets the same access to your calendars as you.")}
      </Text>
      {error && (
        <ErrorState message={t("Failed to load API tokens.")} onRetry={() => mutate()} />
      )}
      {mutationError && <Text size="sm" tone="danger">{t(mutationError)}</Text>}
      <NavigationMenu>
        {tokens.map((token) => (
          <NavigationMenuButtonItem
            key={token.id}
            onClick={() => setDeleteTarget(token)}
          >
            <NavigationMenuItemIcon>
              <KeySquare size={15} />
            </NavigationMenuItemIcon>
            <NavigationMenuItemLabel>{token.name}</NavigationMenuItemLabel>
            <NavigationMenuItemTrailing>
              <Text size="sm" tone="muted">
                {token.tokenPrefix}...
              </Text>
            </NavigationMenuItemTrailing>
          </NavigationMenuButtonItem>
        ))}
        <CreateTokenButton
          onCreated={(plainToken) => {
            setRevealedToken(plainToken);
            mutate();
          }}
          onError={setMutationError}
          createOpen={createOpen}
          setCreateOpen={setCreateOpen}
        />
      </NavigationMenu>
      <Modal
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <ModalContent>
          <ModalTitle>{t("Delete token?")}</ModalTitle>
          <ModalDescription>
            {t("This will permanently revoke \"{name}\". Any scripts or integrations using this token will stop working.", {
              name: deleteTarget?.name ?? "",
            })}
          </ModalDescription>
          <ModalFooter>
            <Button variant="destructive" className="w-full justify-center" onClick={handleDelete}>
              <ButtonText>{t("Delete")}</ButtonText>
            </Button>
            <Button variant="elevated" className="w-full justify-center" onClick={() => setDeleteTarget(null)}>
              <ButtonText>{t("Cancel")}</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal open={!!revealedToken} onOpenChange={(open) => {
        if (!open) handleCloseReveal();
      }}>
        <ModalContent>
          <ModalTitle>{t("Token created")}</ModalTitle>
          <ModalDescription>
            {t("Copy your token now. You won't be able to see it again.")}
          </ModalDescription>
          <div className="flex gap-1.5">
            <Input
              readOnly
              value={revealedToken ?? ""}
              className="text-sm"
            />
            <Button
              variant="border"
              className="shrink-0 aspect-square"
              onClick={handleCopy}
              disabled={!revealedToken}
            >
              <ButtonIcon>
                <CopyTokenIcon copied={copied} />
              </ButtonIcon>
            </Button>
          </div>
          <ModalFooter>
            <Button variant="elevated" className="w-full justify-center" onClick={handleCloseReveal}>
              <ButtonText>{t("Done")}</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

function CreateSubmitButton({ isCreating }: { isCreating: boolean }) {
  const t = useT();
  if (isCreating) {
    return (
      <Button type="submit" className="w-full justify-center" disabled>
        <ButtonText>{t("Creating...")}</ButtonText>
      </Button>
    );
  }

  return (
    <Button type="submit" className="w-full justify-center">
      <ButtonText>{t("Create")}</ButtonText>
    </Button>
  );
}

function CreateTokenButton({
  onCreated,
  onError,
  createOpen,
  setCreateOpen,
}: {
  onCreated: (plainToken: string) => void;
  onError: (error: string | null) => void;
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
}) {
  const t = useT();
  const nameRef = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nameRef.current?.value?.trim();
    if (!name) return;
    onError(null);
    setIsCreating(true);
    try {
      const result = await createApiToken(name);
      track(ANALYTICS_EVENTS.api_token_created);
      setCreateOpen(false);
      onCreated(result.token);
    } catch (err) {
      onError(resolveErrorMessage(err, msg("Failed to create token.")));
      setCreateOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <NavigationMenuButtonItem onClick={() => setCreateOpen(true)}>
        <NavigationMenuItemIcon>
          <Plus size={15} />
        </NavigationMenuItemIcon>
        <NavigationMenuItemLabel>{t("Create Token")}</NavigationMenuItemLabel>
      </NavigationMenuButtonItem>
      <Modal open={createOpen} onOpenChange={setCreateOpen}>
        <ModalContent>
          <form onSubmit={handleSubmit} className="contents">
            <ModalTitle>{t("Create API token")}</ModalTitle>
            <ModalDescription>
              {t("Give your token a name to help you remember what it's used for.")}
            </ModalDescription>
            <Input ref={nameRef} name="name" placeholder={t("Token name")} autoFocus />
            <ModalFooter>
              <CreateSubmitButton isCreating={isCreating} />
              <Button type="button" variant="elevated" className="w-full justify-center" onClick={() => setCreateOpen(false)}>
                <ButtonText>{t("Cancel")}</ButtonText>
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}
