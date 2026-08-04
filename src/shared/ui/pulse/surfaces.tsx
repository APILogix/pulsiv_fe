import { Link } from "react-router";
import { Check, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

// ── module-level constants (rules.md §1.2 — no inline objects in JSX) ──

const TONE_CHIP: Record<string, string> = {
  brand: "bg-[var(--brand-bg)] text-[var(--brand)] ring-[var(--brand)]/25",
  ai: "bg-[var(--ai-bg)] text-[var(--ai)] ring-[var(--ai)]/25",
  green: "bg-[var(--green-bg)] text-[var(--green)] ring-[var(--green)]/25",
  amber: "bg-[var(--amber-bg)] text-[var(--amber)] ring-[var(--amber)]/25",
  red: "bg-[var(--red-bg)] text-[var(--red)] ring-[var(--red)]/25",
  blue: "bg-[var(--blue-bg)] text-[var(--blue)] ring-[var(--blue)]/25",
  violet: "bg-[var(--violet-bg)] text-[var(--violet)] ring-[var(--violet)]/25",
  neutral: "bg-[var(--bg2)] text-[var(--text2)] ring-[var(--border)]",
};

export type SurfaceTone = keyof typeof TONE_CHIP;

// Tailwind can't generate arbitrary values from runtime-built strings, so tone →
// text colour needs an explicit map rather than `text-[var(--${tone})]`.
const TONE_TEXT: Record<SurfaceTone, string> = {
  brand: "text-[var(--brand)]",
  ai: "text-[var(--ai)]",
  green: "text-[var(--green)]",
  amber: "text-[var(--amber)]",
  red: "text-[var(--red)]",
  blue: "text-[var(--blue)]",
  violet: "text-[var(--violet)]",
  neutral: "text-[var(--text)]",
};

export function toneText(tone: SurfaceTone = "neutral") {
  return TONE_TEXT[tone];
}

// ── Breadcrumbs ──────────────────────────────────────────────

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12px] text-[var(--text3)]">
      {items.map((crumb, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="size-3 opacity-60" aria-hidden="true" />}
            {crumb.to && !isLast ? (
              <Link
                to={crumb.to}
                className="rounded-sm transition-colors hover:text-[var(--text2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? "text-[var(--text2)]" : undefined} aria-current={isLast ? "page" : undefined}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// ── Icon chip ────────────────────────────────────────────────

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
  const box = size === "sm" ? "size-7 rounded-[7px]" : size === "lg" ? "size-11 rounded-[12px]" : "size-9 rounded-[10px]";
  const glyph = size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4";
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center ring-1 ring-inset", box, TONE_CHIP[tone], className)}
    >
      <Icon className={glyph} />
    </span>
  );
}

// ── Live dot ─────────────────────────────────────────────────

export function LiveDot({ tone = "green", className }: { tone?: "green" | "amber" | "red" | "ai"; className?: string }) {
  const color = tone === "green" ? "var(--green)" : tone === "amber" ? "var(--amber)" : tone === "red" ? "var(--red)" : "var(--ai)";
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)} aria-hidden="true">
      <span className="pulse-ping absolute inset-0 rounded-full" style={{ background: color }} />
      <span className="relative inline-flex size-2 rounded-full" style={{ background: color }} />
    </span>
  );
}

// ── Status pill ──────────────────────────────────────────────

export function Pill({
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  children: React.ReactNode;
  tone?: SurfaceTone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] ring-1 ring-inset",
        TONE_CHIP[tone],
        className
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

// ── Page hero ────────────────────────────────────────────────
// Replaces the flat PageHeader on redesigned surfaces: adds an eyebrow,
// aurora/grid backdrop, and an optional inline metric strip.

export function PageHero({
  eyebrow,
  title,
  description,
  icon,
  breadcrumbs,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "pulse-grid pulse-aurora relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]",
        className
      )}
    >
      <div className="relative z-10 flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            {icon && <IconChip icon={icon} size="lg" tone="brand" className="mt-0.5" />}
            <div className="min-w-0">
              {breadcrumbs && breadcrumbs.length > 0 && (
                <div className="mb-2">
                  <Breadcrumbs items={breadcrumbs} />
                </div>
              )}
              {eyebrow && (
                <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">{eyebrow}</p>
              )}
              <h1 className="font-[family-name:var(--display)] text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[var(--text)]">
                {title}
              </h1>
              {description && (
                <p className="mt-2 max-w-[68ch] text-[13px] leading-[1.5] text-[var(--text2)]">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </header>
  );
}

// ── Hero metric strip ────────────────────────────────────────
// Compact inline facts rendered inside a PageHero.

export interface HeroFact {
  label: string;
  value: React.ReactNode;
  tone?: SurfaceTone;
  icon?: LucideIcon;
}

export function HeroFacts({ facts }: { facts: HeroFact[] }) {
  if (facts.length === 0) return null;
  return (
    <dl className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-1.5 bg-[var(--bg1)] px-4 py-3">
          <dt className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">
            {fact.icon && <fact.icon className="size-3.5" aria-hidden="true" />}
            {fact.label}
          </dt>
          <dd
            className={cn(
              "font-mono text-[19px] font-medium tabular-nums leading-none tracking-[-0.02em]",
              toneText(fact.tone)
            )}
          >
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ── Panel ────────────────────────────────────────────────────
// The workhorse card: optional icon, title, description, actions, footer.

export function Panel({
  title,
  description,
  icon,
  tone = "brand",
  actions,
  footer,
  children,
  bodyClassName,
  className,
  danger = false,
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  tone?: SurfaceTone;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  bodyClassName?: string;
  className?: string;
  danger?: boolean;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--bg1)]",
        danger ? "border-[var(--red)]/30" : "border-[var(--border)]",
        className
      )}
    >
      {(title || actions) && (
        <div
          className={cn(
            "flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
            danger ? "border-[var(--red)]/20" : "border-[var(--border)]"
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            {icon && <IconChip icon={icon} tone={danger ? "red" : tone} size="sm" className="mt-0.5" />}
            <div className="min-w-0">
              {title && <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">{title}</h2>}
              {description && <p className="mt-1 max-w-[76ch] text-[12px] leading-[1.5] text-[var(--text2)]">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children && <div className={cn("p-5", bodyClassName)}>{children}</div>}
      {footer && (
        <div
          className={cn(
            "flex flex-wrap items-center justify-end gap-2 border-t bg-[var(--bg2)]/60 px-5 py-3",
            danger ? "border-[var(--red)]/20" : "border-[var(--border)]"
          )}
        >
          {footer}
        </div>
      )}
    </section>
  );
}

// ── Toolbar ──────────────────────────────────────────────────
// Filter/search row that pairs with list surfaces.

export function Toolbar({
  children,
  trailing,
  className,
}: {
  children: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-2.5",
        className
      )}
    >
      {children}
      {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
    </div>
  );
}

// ── Section heading ──────────────────────────────────────────

export function SectionHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">{title}</h2>
        {description && <p className="mt-1.5 text-[13px] text-[var(--text2)]">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────

export function EmptyPanel({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--bg1)] px-6 py-14 text-center",
        className
      )}
    >
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-[var(--bg2)] text-[var(--text3)] ring-1 ring-inset ring-[var(--border)]">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="font-[family-name:var(--display)] text-[16px] font-semibold text-[var(--text)]">{title}</h3>
      {description && <p className="mt-1.5 max-w-[42ch] text-[13px] leading-[1.5] text-[var(--text2)]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Notice ───────────────────────────────────────────────────

const NOTICE_TONE: Record<string, string> = {
  brand: "border-[var(--brand)]/25 bg-[var(--brand-bg)] text-[var(--brand)]",
  ai: "border-[var(--ai)]/25 bg-[var(--ai-bg)] text-[var(--ai)]",
  green: "border-[var(--green)]/25 bg-[var(--green-bg)] text-[var(--green)]",
  amber: "border-[var(--amber)]/25 bg-[var(--amber-bg)] text-[var(--amber)]",
  red: "border-[var(--red)]/25 bg-[var(--red-bg)] text-[var(--red)]",
  blue: "border-[var(--blue)]/25 bg-[var(--blue-bg)] text-[var(--blue)]",
  violet: "border-[var(--violet)]/25 bg-[var(--violet-bg)] text-[var(--violet)]",
  neutral: "border-[var(--border)] bg-[var(--bg2)] text-[var(--text2)]",
};

export function Notice({
  icon: Icon,
  tone = "neutral",
  title,
  children,
  action,
  className,
}: {
  icon?: LucideIcon;
  tone?: SurfaceTone;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-3", NOTICE_TONE[tone], className)}>
      {Icon && <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        {title && <p className="text-[13px] font-semibold">{title}</p>}
        {children && <div className={cn("text-[12px] leading-[1.5] text-[var(--text2)]", title && "mt-1")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Setting row ──────────────────────────────────────────────
// Label + description on the left, a control on the right. The workhorse row
// for org, billing, webhook, and integration settings panels.

export function SettingRow({
  label,
  description,
  htmlFor,
  children,
  className,
}: {
  label: string;
  description?: React.ReactNode;
  htmlFor?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6", className)}>
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="block text-[13px] font-medium text-[var(--text)]">
          {label}
        </label>
        {description && <p className="mt-1 max-w-[68ch] text-[12px] leading-[1.5] text-[var(--text2)]">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

// ── Divided stack ────────────────────────────────────────────
// Hairline-separated rows inside a Panel. Pair with `bodyClassName="p-0"` and
// the children get their own padding.

export function RowStack({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("divide-y divide-[var(--border)]", className)}>{children}</div>;
}

export function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

// ── Toggle ───────────────────────────────────────────────────
// Token-driven switch. Controlled; `pending` dims it during a mutation.

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      disabled={disabled}
    />
  );
}

// ── Setup steps ──────────────────────────────────────────────
// Numbered guide used by SSO, SCIM, domain, and integration setup rails.

export interface SetupStepItem {
  title: string;
  description?: React.ReactNode;
  done?: boolean;
}

export function SetupSteps({ steps }: { steps: SetupStepItem[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-3">
          <span
            className={cn(
              "mt-px inline-flex size-6 shrink-0 items-center justify-center rounded-full font-[family-name:var(--mono)] text-[11px] font-semibold ring-1 ring-inset",
              step.done
                ? "bg-[var(--green-bg)] text-[var(--green)] ring-[var(--green)]/25"
                : "bg-[var(--bg2)] text-[var(--text3)] ring-[var(--border)]"
            )}
            aria-hidden="true"
          >
            {step.done ? <Check className="size-3.5" /> : index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--text)]">{step.title}</p>
            {step.description && (
              <div className="mt-1 text-[12px] leading-[1.5] text-[var(--text2)]">{step.description}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Two-column settings shell ────────────────────────────────
// Main configuration column plus a side rail that stacks on mobile.

export function SplitShell({
  children,
  rail,
  className,
}: {
  children: React.ReactNode;
  rail: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_324px]", className)}>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
      <div className="flex flex-col gap-6">{rail}</div>
    </div>
  );
}
