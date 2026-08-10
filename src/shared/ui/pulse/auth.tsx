import { Link } from "react-router";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconChip, type SurfaceTone } from "./surfaces";

// ── Auth heading ─────────────────────────────────────────────

export function AuthHeading({
  eyebrow,
  title,
  description,
  icon,
  tone = "brand",
  align = "left",
  hideLogo = false,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  tone?: SurfaceTone;
  align?: "left" | "center";
  hideLogo?: boolean;
}) {
  const centered = align === "center";
  return (
    <div className={cn("mb-5 flex flex-col gap-2", centered && "items-center text-center")}>
      {icon && <IconChip icon={icon} tone={tone} size="lg" />}
      {eyebrow && (
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">{eyebrow}</p>
      )}
      <div className={cn("flex flex-col gap-1.5", centered && "items-center")}>
        <div className={cn("flex items-center justify-between gap-3", centered && "flex-col items-center")}>
          <h1 className="font-[family-name:var(--display)] text-[26px] font-semibold leading-tight tracking-[-0.03em] text-[var(--text)]">
            {title}
          </h1>
          {!hideLogo && (
            <span
              className="font-[family-name:var(--mono)] text-[22px] font-bold tracking-[0.16em] text-[var(--text)] shrink-0"
              aria-label="Sentinel"
            >
              SENT<span className="text-[var(--brand)]">I</span>NEL
            </span>
          )}
        </div>
        {description && (
          <p className={cn("text-[13px] leading-[1.5] text-[var(--text2)]", centered ? "max-w-[38ch]" : "max-w-[44ch]")}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Auth card ────────────────────────────────────────────────

export function AuthCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        // §6 — a hairline border carries the card; no gradient chrome, no
        // decorative brand glow (§3).
        "relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 sm:p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

// ── Divider with label ───────────────────────────────────────

export function AuthDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 flex items-center">
      <span className="h-px flex-1 bg-[var(--border)]" />
      <span className="px-3 font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">{children}</span>
      <span className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}

// ── OAuth button ─────────────────────────────────────────────

export function OAuthButton({
  children,
  icon,
  onClick,
  disabled,
  pending,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className="flex h-10 w-full items-center justify-center gap-2.5 rounded-[var(--radius)] border border-[var(--border2)] bg-transparent text-[13px] font-medium text-[var(--text2)] transition-colors duration-150 hover:border-[var(--text3)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)] disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : icon}
      {pending ? "Redirecting…" : children}
    </button>
  );
}

// ── Primary auth action ──────────────────────────────────────

export function AuthButton({
  children,
  type = "submit",
  onClick,
  disabled,
  pending,
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  type?: "submit" | "button";
  onClick?: () => void;
  disabled?: boolean;
  pending?: boolean;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
}) {
  const tone =
    variant === "ghost"
      ? "border border-[var(--border2)] bg-transparent text-[var(--text2)] hover:border-[var(--text3)] hover:text-[var(--text)]"
      : variant === "danger"
        ? "bg-[var(--red)] text-white hover:bg-[var(--red-d)]"
        : "bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-d)]";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || pending}
      aria-busy={pending}
      className={cn(
        "inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius)] text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)] disabled:cursor-not-allowed disabled:opacity-55",
        tone,
        className
      )}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

// ── Submit button bound to form status (rules.md §4.4) ────────

export function AuthSubmit({
  children,
  pendingLabel = "Working…",
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <AuthButton type="submit" pending={pending} variant={variant} className={className}>
      {pending ? pendingLabel : children}
    </AuthButton>
  );
}

// ── Result / status screen ───────────────────────────────────

export function AuthResult({
  icon,
  tone,
  title,
  description,
  children,
  actions,
}: {
  icon: LucideIcon;
  tone: SurfaceTone;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <IconChip icon={icon} tone={tone} size="lg" className="mb-5" />
      <h1 className="font-[family-name:var(--display)] text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[var(--text)]">
        {title}
      </h1>
      {description && <p className="mt-2.5 max-w-[42ch] text-[13px] leading-[1.6] text-[var(--text2)]">{description}</p>}
      {children && <div className="mt-6 w-full">{children}</div>}
      {actions && <div className="mt-7 flex w-full flex-col gap-2.5">{actions}</div>}
    </div>
  );
}

// ── Footer link row ──────────────────────────────────────────

export function AuthFooter({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 text-center text-[13px] text-[var(--text3)]">{children}</p>;
}

export function AuthLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-sm font-medium text-[var(--brand)] transition-colors hover:text-[var(--brand-d)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)]"
    >
      {children}
    </Link>
  );
}

// ── Field label + error ──────────────────────────────────────

export function AuthField({
  label,
  htmlFor,
  error,
  hint,
  trailing,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">
          {label}
        </label>
        {trailing}
      </div>
      {children}
      {hint && !error && <p className="text-[12px] text-[var(--text3)]">{hint}</p>}
      {error && (
        <p role="alert" className="text-[12px] font-medium text-[var(--red)]">
          {error}
        </p>
      )}
    </div>
  );
}
