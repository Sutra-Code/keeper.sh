import { cn } from "@/utils/cn";

export const EVENT_COLORS = {
  ink: cn(
    "[--event-ink:var(--color-neutral-950)] [--event-surface:var(--color-neutral-200)] [--event-accent:var(--color-neutral-950)]",
    "dark:[--event-ink:var(--color-neutral-100)] dark:[--event-surface:color-mix(in_srgb,var(--color-neutral-500)_24%,var(--color-background))] dark:[--event-accent:var(--color-neutral-300)]",
  ),
};

export type EventColor = keyof typeof EVENT_COLORS;
