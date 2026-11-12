import { cn } from "@/utils/cn";

export const EVENT_COLORS = {
  ink: cn(
    "[--event-ink:var(--color-neutral-950)] [--event-surface:var(--color-neutral-200)] [--event-accent:var(--color-neutral-950)]",
    "dark:[--event-ink:var(--color-neutral-100)] dark:[--event-surface:color-mix(in_srgb,var(--color-neutral-500)_24%,var(--color-background))] dark:[--event-accent:var(--color-neutral-300)]",
  ),
  blue: cn(
    "[--event-ink:var(--color-neutral-950)] [--event-surface:color-mix(in_srgb,var(--account-blue)_16%,var(--color-background-elevated))] [--event-accent:var(--account-blue)]",
    "dark:[--event-ink:var(--color-neutral-100)] dark:[--event-surface:color-mix(in_srgb,var(--account-blue)_26%,var(--color-background-elevated))]",
  ),
  green: cn(
    "[--event-ink:var(--color-neutral-950)] [--event-surface:color-mix(in_srgb,var(--account-green)_16%,var(--color-background-elevated))] [--event-accent:var(--account-green)]",
    "dark:[--event-ink:var(--color-neutral-100)] dark:[--event-surface:color-mix(in_srgb,var(--account-green)_26%,var(--color-background-elevated))]",
  ),
  amber: cn(
    "[--event-ink:var(--color-neutral-950)] [--event-surface:color-mix(in_srgb,var(--account-amber)_16%,var(--color-background-elevated))] [--event-accent:var(--account-amber)]",
    "dark:[--event-ink:var(--color-neutral-100)] dark:[--event-surface:color-mix(in_srgb,var(--account-amber)_26%,var(--color-background-elevated))]",
  ),
  rose: cn(
    "[--event-ink:var(--color-neutral-950)] [--event-surface:color-mix(in_srgb,var(--account-rose)_16%,var(--color-background-elevated))] [--event-accent:var(--account-rose)]",
    "dark:[--event-ink:var(--color-neutral-100)] dark:[--event-surface:color-mix(in_srgb,var(--account-rose)_26%,var(--color-background-elevated))]",
  ),
  violet: cn(
    "[--event-ink:var(--color-neutral-950)] [--event-surface:color-mix(in_srgb,var(--account-violet)_16%,var(--color-background-elevated))] [--event-accent:var(--account-violet)]",
    "dark:[--event-ink:var(--color-neutral-100)] dark:[--event-surface:color-mix(in_srgb,var(--account-violet)_26%,var(--color-background-elevated))]",
  ),
  teal: cn(
    "[--event-ink:var(--color-neutral-950)] [--event-surface:color-mix(in_srgb,var(--account-teal)_16%,var(--color-background-elevated))] [--event-accent:var(--account-teal)]",
    "dark:[--event-ink:var(--color-neutral-100)] dark:[--event-surface:color-mix(in_srgb,var(--account-teal)_26%,var(--color-background-elevated))]",
  ),
  orange: cn(
    "[--event-ink:var(--color-neutral-950)] [--event-surface:color-mix(in_srgb,var(--account-orange)_16%,var(--color-background-elevated))] [--event-accent:var(--account-orange)]",
    "dark:[--event-ink:var(--color-neutral-100)] dark:[--event-surface:color-mix(in_srgb,var(--account-orange)_26%,var(--color-background-elevated))]",
  ),
  slate: cn(
    "[--event-ink:var(--color-neutral-950)] [--event-surface:color-mix(in_srgb,var(--account-slate)_16%,var(--color-background-elevated))] [--event-accent:var(--account-slate)]",
    "dark:[--event-ink:var(--color-neutral-100)] dark:[--event-surface:color-mix(in_srgb,var(--account-slate)_26%,var(--color-background-elevated))]",
  ),
};

export type EventColor = keyof typeof EVENT_COLORS;
