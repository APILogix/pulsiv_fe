import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Check, CheckCircle2, Copy, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Redesign primitives (newdesign.md §5.2) ──
// Module-level constants only — rules.md §1.2 (no inline objects in JSX).

const TILE_TONES: Record<string, string> = {
  brand: "bg-[var(--brand-bg)] text-[var(--brand)]",
  green: "bg-[var(--green-bg)] text-[var(--green)]",
  red: "bg-[var(--red-bg)] text-[var(--red)]",
  amber: "bg-[var(--amber-bg)] text-[var(--amber)]",
  blue: "bg-[var(--blue-bg)] text-[var(--blue)]",
  violet: "bg-[var(--violet-bg)] text-[var(--violet)]",
  neutral: "bg-[var(--bg2)] text-[var(--text2)]",
};

export type TileTone = "brand" | "green" | "red" | "amber" | "blue" | "violet" | "neutral";

export function HeroPanel({ children, className }: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-5", className)}>
      {children}
    </div>
  );
}

const STAT_CHIP_TONES: Record<string, string> = {
  default: "text-[var(--text)]",
  success: "text-[var(--green)]",
  warning: "text-[var(--amber)]",
  danger: "text-[var(--red)]",
};

export function StatChip({ label, value, tone = "default" }: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <div className="flex items-baseline gap-1.5 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-2.5 py-1.5">
      <span className={cn("font-[family-name:var(--mono)] text-[13px] font-semibold tabular-nums", STAT_CHIP_TONES[tone] ?? STAT_CHIP_TONES.default)}>
        {value}
      </span>
      <span className="text-[11px] text-[var(--text3)]">{label}</span>
    </div>
  );
}

export function IconTile({ icon: Icon, tone = "brand", className }: {
  icon: LucideIcon;
  tone?: TileTone;
  className?: string;
}) {
  return (
    <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-[10px]", TILE_TONES[tone] ?? TILE_TONES.brand, className)}>
      <Icon className="size-5" />
    </div>
  );
}

export function ToggleRow({ label, description, checked, onChange, disabled }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-[var(--text)]">{label}</div>
        {description && <div className="mt-0.5 text-[12px] leading-relaxed text-[var(--text2)]">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-[var(--brand)]" : "bg-[var(--bg3)]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-[var(--bg1)] shadow-sm transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

const CALLOUT_TONES: Record<string, { box: string; icon: LucideIcon }> = {
  info: { box: "border-[var(--blue)]/25 bg-[var(--blue-bg)] text-[var(--blue)]", icon: Info },
  warning: { box: "border-[var(--amber)]/25 bg-[var(--amber-bg)] text-[var(--amber)]", icon: AlertTriangle },
  danger: { box: "border-[var(--red)]/25 bg-[var(--red-bg)] text-[var(--red)]", icon: OctagonAlert },
  success: { box: "border-[var(--green)]/25 bg-[var(--green-bg)] text-[var(--green)]", icon: CheckCircle2 },
};

export function Callout({ tone = "info", children }: {
  tone?: "info" | "warning" | "danger" | "success";
  children: React.ReactNode;
}) {
  const entry = CALLOUT_TONES[tone] ?? CALLOUT_TONES.info;
  const Icon = entry.icon;
  return (
    <div className={cn("flex items-start gap-2.5 rounded-[10px] border p-3.5", entry.box)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="text-[13px] leading-relaxed text-[var(--text)]">{children}</div>
    </div>
  );
}

export function DangerZone({ title = "Danger zone", children }: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-[var(--red)]/25 bg-[var(--bg1)]">
      <div className="border-b border-[var(--red)]/25 px-5 py-3">
        <h3 className="text-sm font-semibold text-[var(--red)]">{title}</h3>
      </div>
      <div className="flex flex-col gap-4 p-5">{children}</div>
    </div>
  );
}

export function DangerRow({ label, description, action }: {
  label: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-[var(--text)]">{label}</div>
        <div className="mt-0.5 text-[12px] leading-relaxed text-[var(--text2)]">{description}</div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

export function EmptyState({ icon: Icon, message, action }: {
  icon: LucideIcon;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <Icon className="size-8 text-[var(--text3)]" />
      <p className="text-[13px] text-[var(--text2)]">{message}</p>
      {action}
    </div>
  );
}

export function SetupStep({ step, title, description }: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg2)] font-[family-name:var(--mono)] text-[11px] font-medium text-[var(--text2)]">
        {step}
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-[var(--text)]">{title}</div>
        <div className="mt-0.5 text-[12px] leading-relaxed text-[var(--text2)]">{description}</div>
      </div>
    </div>
  );
}

export function CopyField({ value, mono = true, masked = false }: {
  value: string;
  mono?: boolean;
  masked?: boolean;
}) {
  const display = masked ? `••••••••${value.slice(-4)}` : value;
  return (
    <div className="flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] py-1.5 pl-3 pr-1.5">
      <span
        className={cn("min-w-0 flex-1 truncate text-[12px] text-[var(--text2)]", mono && "font-[family-name:var(--mono)]")}
        title={masked ? undefined : value}
      >
        {display}
      </span>
      <CopyButtonInline value={value} />
    </div>
  );
}

// Local thin copy button to avoid circular import with primitives.tsx
function CopyButtonInline({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy to clipboard"
      className="flex size-7 shrink-0 items-center justify-center rounded-[6px] text-[var(--text3)] transition-colors hover:bg-[var(--bg3)] hover:text-[var(--text)]"
    >
      {copied ? <Check className="size-3.5 text-[var(--green)]" /> : <Copy className="size-3.5" />}
    </button>
  );
}

export function UsageBar({ used, limit, label }: {
  used: number;
  limit: number;
  label?: string;
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const tone = pct > 90 ? "var(--red)" : pct > 70 ? "var(--amber)" : "var(--green)";
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[var(--text2)]">{label}</span>
          <span className="font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]">
            {used.toLocaleString()} / {limit.toLocaleString()}
          </span>
        </div>
      )}
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg3)]">
        <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: tone }} />
      </div>
    </div>
  );
}
