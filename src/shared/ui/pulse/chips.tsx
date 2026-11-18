import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SurfaceTone =
  | "brand"
  | "ai"
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "violet"
  | "neutral"
  | (string & {});

// Icon chips carry colour only when the tone is a state (truth channel) or the
// model (ai). Brand, blue, and violet collapse to neutral so chips never
// decorate chrome (design/dashboards/DESIGN.md).
export const ICON_CHIP_TONE: Record<SurfaceTone, string> = {
  brand: "bg-[var(--bg2)] text-[var(--text2)] ring-[var(--border)]",
  ai: "bg-[var(--ai-bg)] text-[var(--ai)] ring-[var(--ai)]/20",
  green: "bg-[var(--green-bg)] text-[var(--green)] ring-[var(--green)]/20",
  amber: "bg-[var(--amber-bg)] text-[var(--amber)] ring-[var(--amber)]/20",
  red: "bg-[var(--red-bg)] text-[var(--red)] ring-[var(--red)]/20",
  blue: "bg-[var(--bg2)] text-[var(--text2)] ring-[var(--border)]",
  violet: "bg-[var(--bg2)] text-[var(--text2)] ring-[var(--border)]",
  neutral: "bg-[var(--bg2)] text-[var(--text2)] ring-[var(--border)]",
};

export function IconChip({
  icon: Icon,
  tone = "brand",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: SurfaceTone;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box = size === "sm" ? "size-7 rounded-[var(--radius)]" : size === "lg" ? "size-10 rounded-[var(--radius-lg)]" : "size-8 rounded-[var(--radius)]";
  const glyph = size === "sm" ? "size-3.5" : size === "lg" ? "size-[18px]" : "size-4";
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center ring-1 ring-inset", box, ICON_CHIP_TONE[tone], className)}
    >
      <Icon className={glyph} />
    </span>
  );
}

