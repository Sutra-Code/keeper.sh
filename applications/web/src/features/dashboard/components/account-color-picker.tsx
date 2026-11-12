import { ACCOUNT_COLORS, type AccountColor } from "@keeper.sh/data-schemas";
import Check from "lucide-react/dist/esm/icons/check";
import { msg, useT } from "@/i18n";

const COLOR_NAMES: Record<AccountColor, string> = {
  amber: msg("Amber"),
  blue: msg("Blue"),
  green: msg("Green"),
  orange: msg("Orange"),
  rose: msg("Rose"),
  slate: msg("Slate"),
  teal: msg("Teal"),
  violet: msg("Violet"),
};

interface AccountColorPickerProps {
  value: AccountColor;
  disabled?: boolean;
  onChange: (color: AccountColor) => void;
}

export function AccountColorPicker({ value, disabled, onChange }: AccountColorPickerProps) {
  const t = useT();

  return (
    <div role="radiogroup" aria-label={t("Account color")} className="flex items-center gap-1.5">
      {ACCOUNT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={color === value}
          aria-label={t(COLOR_NAMES[color])}
          title={t(COLOR_NAMES[color])}
          disabled={disabled}
          onClick={() => onChange(color)}
          className="flex size-5 cursor-pointer items-center justify-center rounded-full text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-default disabled:opacity-60 dark:text-neutral-950"
          style={{ backgroundColor: `var(--account-${color})` }}
        >
          {color === value && <Check size={12} strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}
