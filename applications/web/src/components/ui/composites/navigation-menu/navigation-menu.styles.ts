import { tv, type VariantProps } from "tailwind-variants/lite";

export const navigationMenuStyle = tv({
  base: "flex flex-col rounded-[1.4rem] p-1",
  variants: {
    variant: {
      default: "bg-background-elevated",
      highlight: "relative before:absolute before:top-0.5 before:inset-x-0 before:h-px before:bg-linear-to-r before:mx-4 before:z-10 before:from-transparent before:to-transparent bg-neutral-950 dark:bg-neutral-800 before:via-neutral-500",
      attention: "relative bg-attention-background border border-attention-border shadow-xs attention-hatch before:absolute before:inset-1 before:rounded-2xl before:bg-attention-background before:pointer-events-none",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type MenuVariant = VariantProps<typeof navigationMenuStyle>["variant"];

export const navigationMenuItemStyle = tv({
  base: "rounded-2xl flex min-h-11 items-center gap-3 p-1.5 pl-3 pr-3 has-data-menu-icon:pl-1.5 w-full",
  variants: {
    variant: {
      default: "",
      highlight: "bg-linear-to-t from-neutral-950 to-neutral-800 dark:from-neutral-800 dark:to-neutral-700",
      attention: "relative",
    },
    interactive: {
      true: "hover:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      false: "",
    },
  },
  compoundVariants: [
    { variant: "default", interactive: true, className: "hover:bg-background-hover" },
    { variant: "highlight", interactive: true, className: "hover:brightness-110" },
    { variant: "attention", interactive: true, className: "hover:bg-attention-background-hover" },
  ],
  defaultVariants: {
    variant: "default",
    interactive: true,
  },
});

export const navigationMenuItemIconStyle = tv({
  base: "shrink-0",
  variants: {
    variant: {
      default: "text-foreground-muted",
      highlight: "text-white",
      attention: "text-attention",
    },
    disabled: {
      true: "text-foreground-disabled",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});


export const navigationMenuToggleTrack = tv({
  base: "w-8 h-5 rounded-full shrink-0 flex items-center p-0.5",
  variants: {
    variant: {
      default: "",
      highlight: "",
      attention: "",
    },
    checked: {
      true: "",
      false: "",
    },
    disabled: {
      true: "opacity-30",
      false: "",
    },
  },
  compoundVariants: [
    { variant: "default", checked: false, className: "bg-interactive-border" },
    { variant: "default", checked: true, className: "bg-foreground" },
    { variant: "highlight", checked: false, className: "bg-foreground-inverse-muted" },
    { variant: "highlight", checked: true, className: "bg-foreground-inverse" },
    { variant: "attention", checked: false, className: "bg-interactive-border" },
    { variant: "attention", checked: true, className: "bg-foreground" },
  ],
  defaultVariants: {
    variant: "default",
    checked: false,
    disabled: false,
  },
});

export const navigationMenuToggleThumb = tv({
  base: "size-4 rounded-full",
  variants: {
    variant: {
      default: "bg-background-elevated",
      highlight: "bg-foreground",
      attention: "bg-background-elevated",
    },
    checked: {
      true: "ml-auto",
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    checked: false,
  },
});

export const navigationMenuCheckbox = tv({
  base: "size-4 rounded shrink-0 flex items-center justify-center border",
  variants: {
    variant: {
      default: "border-interactive-border",
      highlight: "border-foreground-inverse-muted",
      attention: "border-interactive-border",
    },
    checked: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    { variant: "default", checked: true, className: "bg-foreground border-foreground" },
    { variant: "highlight", checked: true, className: "bg-foreground-inverse border-foreground-inverse" },
    { variant: "attention", checked: true, className: "bg-foreground border-foreground" },
  ],
  defaultVariants: {
    variant: "default",
    checked: false,
  },
});

export const navigationMenuCheckboxIcon = tv({
  base: "shrink-0",
  variants: {
    variant: {
      default: "text-foreground-inverse",
      highlight: "text-foreground",
      attention: "text-foreground-inverse",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export const LABEL_TONE: Record<
  NonNullable<MenuVariant>,
  "muted" | "inverse" | "highlight" | "attention" | "default"
> = {
  default: "muted",
  highlight: "highlight",
  attention: "default",
};

export const DISABLED_LABEL_TONE: Record<
  NonNullable<MenuVariant>,
  "disabled" | "inverseMuted" | "highlight" | "attention"
> = {
  default: "disabled",
  highlight: "highlight",
  attention: "disabled",
};
