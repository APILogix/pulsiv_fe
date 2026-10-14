import { Link } from "react-router";
import { Check, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

// ── module-level constants (rules.md §1.2 — no inline objects in JSX) ──

// Known tones. The type was historically derived from a Record<string, …>, so
// it has always accepted any string; `(string & {})` keeps that contract while
// still autocompleting the named tones.
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
const ICON_CHIP_TONE: Record<SurfaceTone, string> = {
  brand: "bg-[var(--bg2)] text-[var(--text2)] ring-[var(--border)]",
  ai: "bg-[var(--ai-bg)] text-[var(--ai)] ring-[var(--ai)]/20",
  green: "bg-[var(--green-bg)] text-[var(--green)] ring-[var(--green)]/20",
  amber: "bg-[var(--amber-bg)] text-[var(--amber)] ring-[var(--amber)]/20",
  red: "bg-[var(--red-bg)] text-[var(--red)] ring-[var(--red)]/20",
  blue: "bg-[var(--bg2)] text-[var(--text2)] ring-[var(--border)]",
  violet: "bg-[var(--bg2)] text-[var(--text2)] ring-[var(--border)]",
  neutral: "bg-[var(--bg2)] text-[var(--text2)] ring-[var(--border)]",
};

// Status pills: sentence case, 4px radius, a flat tint of the state colour.
const PILL_TONE: Record<SurfaceTone, string> = {
  brand: "bg-[var(--bg3)] text-[var(--text)]",
  ai: "bg-[var(--ai-bg)] text-[var(--ai)]",
  green: "bg-[var(--green-bg)] text-[var(--green)]",
  amber: "bg-[var(--amber-bg)] text-[var(--amber)]",
  red: "bg-[var(--red-bg)] text-[var(--red)]",
  blue: "bg-[var(--blue-bg)] text-[var(--blue)]",
  violet: "bg-[var(--violet-bg)] text-[var(--violet)]",
  neutral: "bg-[var(--bg3)] text-[var(--text2)]",
};

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
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium leading-[1.35]",
        PILL_TONE[tone],
        className
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {/* Sentence case without rewriting callers' strings. */}
      <span className="inline-block first-letter:uppercase">{children}</span>
    </span>
  );
}

// ── Page hero ────────────────────────────────────────────────
// The page header sits on the canvas, never inside a card: title,
// description, actions, then an optional readout band (HeroFacts). No
// backdrop, no icon chip, no eyebrow (design/dashboards/DESIGN.md).
// `eyebrow` and `icon` stay in the signature so existing call sites compile;
// they are intentionally not rendered.

export function PageHero({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
}: {
  /** @deprecated Not rendered. Headings carry their own weight. */
  eyebrow?: string;
  title: string;
  description?: string;
  /** @deprecated Not rendered. */
  icon?: LucideIcon;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="mb-2">
              <Breadcrumbs items={breadcrumbs} />
            </div>
          )}
          <h1 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.025em] text-[var(--text)]">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-[72ch] text-[13px] leading-[1.6] text-[var(--text2)]">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

// ── Readout band ─────────────────────────────────────────────
// Hairline-divided cells of label + value. Used under a PageHero.

export interface HeroFact {
  label: string;
  value: React.ReactNode;
  tone?: SurfaceTone;
  icon?: LucideIcon;
}

export function HeroFacts({ facts }: { facts: HeroFact[] }) {
  if (facts.length === 0) return null;
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border)] lg:grid-cols-4">
      {facts.map((fact) => (
        <div key={fact.label} className="flex min-w-0 flex-col gap-2.5 bg-[var(--bg1)] px-5 py-4">
          <dt className="truncate text-[12px] text-[var(--text2)]">{fact.label}</dt>
          <dd
            className={cn(
              "truncate font-mono text-[22px] font-medium tabular-nums leading-none tracking-[-0.02em]",
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

function DangerGlyph({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="size-4 shrink-0 text-[var(--red)]" aria-hidden="true" />;
}

export function Panel({
  title,
  description,
  icon,
  actions,
  footer,
  children,
  bodyClassName,
  className,
  danger = false,
}: {
  title?: string;
  description?: string;
  /** Rendered only on `danger` panels. */
  icon?: LucideIcon;
  /** @deprecated Panels no longer carry a tone chip. */
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
          <div className="flex min-w-0 items-center gap-2.5">
            {/* Only a danger panel keeps its glyph: it is state, not decoration. */}
            {danger && icon && <DangerGlyph icon={icon} />}
            <div className="min-w-0">
              {title && <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">{title}</h2>}
              {description && <p className="mt-1 max-w-[76ch] text-[12px] leading-[1.55] text-[var(--text2)]">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children && <div className={cn("p-5", bodyClassName)}>{children}</div>}
      {footer && (
        <div
          className={cn(
            "flex flex-wrap items-center justify-end gap-2 border-t bg-[var(--bg1)] px-5 py-3.5",
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
        "flex flex-wrap items-center gap-2.5 border-b border-[var(--border)] pb-3",
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
        <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-[var(--text)]">{title}</h2>
        {description && <p className="mt-1 text-[13px] text-[var(--text2)]">{description}</p>}
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
        "flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] px-8 py-14 text-center",
        className
      )}
    >
      <Icon className="mb-4 size-5 text-[var(--text3)]" aria-hidden="true" />
      <h3 className="text-[14px] font-semibold text-[var(--text)]">{title}</h3>
      {description && <p className="mt-1.5 max-w-[46ch] text-[13px] leading-[1.6] text-[var(--text2)]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Notice ───────────────────────────────────────────────────

const NOTICE_TONE: Record<string, string> = {
  brand: "border-[var(--border2)] bg-[var(--bg1)] text-[var(--text)]",
  ai: "border-[var(--ai)]/25 bg-[var(--ai-bg)] text-[var(--ai)]",
  green: "border-[var(--green)]/25 bg-[var(--green-bg)] text-[var(--green)]",
  amber: "border-[var(--amber)]/25 bg-[var(--amber-bg)] text-[var(--amber)]",
  red: "border-[var(--red)]/25 bg-[var(--red-bg)] text-[var(--red)]",
  blue: "border-[var(--border2)] bg-[var(--bg1)] text-[var(--text)]",
  violet: "border-[var(--border2)] bg-[var(--bg1)] text-[var(--text)]",
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
    <div className={cn("flex items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-3.5", NOTICE_TONE[tone], className)}>
      {Icon && <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        {title && <p className="text-[13px] font-semibold">{title}</p>}
        {children && <div className={cn("text-[12px] leading-[1.6] text-[var(--text2)]", title && "mt-1.5")}>{children}</div>}
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
        {description && <p className="mt-1.5 max-w-[68ch] text-[12px] leading-[1.6] text-[var(--text2)]">{description}</p>}
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
  return <div className={cn("px-6 py-5", className)}>{children}</div>;
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
    <ol className="flex flex-col gap-5">
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
    <div className={cn("grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_324px]", className)}>
      <div className="flex min-w-0 flex-col gap-7">{children}</div>
      <div className="flex flex-col gap-7">{rail}</div>
    </div>
  );
}
