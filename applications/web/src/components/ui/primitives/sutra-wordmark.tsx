import { cn } from "@/utils/cn";

export function SutraWordmark({ className }: { className?: string }) {
  return (
    <img
      src="/sutracode-logo.png"
      alt="SutraCode"
      width={150}
      height={26}
      draggable={false}
      className={cn("h-auto w-[150px] dark:invert", className)}
    />
  );
}
