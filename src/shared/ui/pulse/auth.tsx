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
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  tone?: SurfaceTone;
  align?: "left" | "center";
}) {
  const centered = align === "center";
  return (
    <div className={cn("mb-7 flex flex-col gap-3", centered && "items-center text-center")}>
      {icon && <IconChip icon={icon} tone={tone} size="lg" />}
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ai)]">{eyebrow}</p>
      )}
      <div className={cn("flex flex-col gap-2", centered && "items-center")}>
        <h1 className="font-[family-name:var(--display)] text-[27px] font-semibold leading-tight tracking-[-0.03em] text-[var(--text)]">
          {title}
        </h1>
        {description && (
          <p className={cn("text-[14px] leading-relaxed text-[var(--text2)]", centered ? "max-w-[38ch]" : "max-w-[44ch]")}>
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
        "pulse-edge relative overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-[0_18px_50px_-24px_color-mix(in_srgb,var(--brand)_35%,transparent)]",
        className
      )}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, var(--brand), var(--ai), transparent)" }}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

// ── Divider with label ───────────────────────────────────────

export function AuthDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-5 flex items-center">
      <span className="h-px flex-1 bg-[var(--border)]" />
      <span className="px-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--text3)]">{children}</span>
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
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-[9px] border border-[var(--border)] bg-[var(--bg2)] text-[13.5px] font-medium text-[var(--text)] transition-colors hover:border-[var(--border2)] hover:bg-[var(--bg3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-55"
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
      ? "border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] hover:border-[var(--border2)] hover:bg-[var(--bg3)]"
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
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-[9px] text-[13.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg1)] disabled:cursor-not-allowed disabled:opacity-55",
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
      {description && <p className="mt-2.5 max-w-[42ch] text-[14px] leading-relaxed text-[var(--text2)]">{description}</p>}
      {children && <div className="mt-6 w-full">{children}</div>}
      {actions && <div className="mt-7 flex w-full flex-col gap-2.5">{actions}</div>}
    </div>
  );
}

// ── Footer link row ──────────────────────────────────────────

export function AuthFooter({ children }: { children: React.ReactNode }) {
  return <p className="mt-7 text-center text-[13px] text-[var(--text3)]">{children}</p>;
}

export function AuthLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-sm font-medium text-[var(--brand)] transition-colors hover:text-[var(--brand-d)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
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
        <label htmlFor={htmlFor} className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text3)]">
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
