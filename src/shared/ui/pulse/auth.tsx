import { Link } from "react-router";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconChip, type SurfaceTone } from "./surfaces";

// ── Auth heading ─────────────────────────────────────────────
// The heading carries the page. No eyebrow, no icon chip, no centering: the
// same left-aligned title + one supporting line the sign-in page uses.
// See design/auth/DESIGN.md.

export function AuthHeading({
  title,
  description,
}: {
  title: string;
  description?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] text-[var(--text)]">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-[46ch] text-[14px] leading-[1.55] text-[var(--text2)]">{description}</p>
      )}
    </header>
  );
}

// ── Callout ──────────────────────────────────────────────────
// The one boxed element auth allows. Reserved for information that changes
// what the user does next (SSO-governed domain, failed link, locked account).
// Tone lives in the icon and a tinted hairline only; the body stays neutral.

const CALLOUT_TONE = {
  neutral: { box: "border-[var(--border2)]", icon: "text-[var(--text)]" },
  success: { box: "border-[var(--green)]/35", icon: "text-[var(--green)]" },
  warning: { box: "border-[var(--amber)]/35", icon: "text-[var(--amber)]" },
  danger: { box: "border-[var(--red)]/40", icon: "text-[var(--red)]" },
} as const;

export type AuthCalloutTone = keyof typeof CALLOUT_TONE;

export function AuthCallout({
  icon: Icon,
  title,
  children,
  tone = "neutral",
  role = "status",
  className,
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
  tone?: AuthCalloutTone;
  role?: "status" | "alert";
  className?: string;
}) {
  const palette = CALLOUT_TONE[tone];
  return (
    <div
      role={role}
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius)] border bg-[var(--bg1)] px-3.5 py-3",
        palette.box,
        className
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", palette.icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-[1.5] text-[var(--text)]">{title}</p>
        {children && <div className="mt-0.5 text-[12px] leading-[1.55] text-[var(--text2)]">{children}</div>}
      </div>
    </div>
  );
}

// ── Fact row ─────────────────────────────────────────────────
// "Signing in as" pattern: a quiet label over the one value the user must
// recognise (address, domain, factor), closed by a hairline.

export function AuthFact({
  label,
  value,
  mono = false,
  action,
  className,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4", className)}>
      <div className="min-w-0">
        <p className="text-[12px] text-[var(--text3)]">{label}</p>
        <span
          className={cn(
            "mt-0.5 block min-w-0 truncate text-[14px] font-medium text-[var(--text)]",
            mono && "font-mono text-[13px]"
          )}
        >
          {value}
        </span>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Pending line ─────────────────────────────────────────────

export function AuthPending({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-2 text-[13px] text-[var(--text2)]", className)}
    >
      <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--text3)]" aria-hidden="true" />
      {children}
    </p>
  );
}

// ── Inline text action ───────────────────────────────────────
// Underlined, quiet. For "Change", "Resend code", "Try another way".

export const authTextActionClass =
  "rounded-sm text-[13px] font-medium text-[var(--text2)] underline decoration-[var(--border2)] underline-offset-4 transition-colors hover:text-[var(--text)] hover:decoration-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:text-[var(--text3)] disabled:no-underline";

export function AuthTextButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn(authTextActionClass, className)}>
      {children}
    </button>
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
    <div className="my-5 flex items-center">
      <span className="h-px flex-1 bg-[var(--border)]" />
      <span className="px-3 text-[12px] text-[var(--text3)]">{children}</span>
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
  pendingText,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
  pendingText?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-[var(--radius)] border border-[var(--border2)] bg-transparent text-[13px] font-medium text-[var(--text)] transition-colors duration-150 hover:border-[var(--text3)] hover:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : icon}
      {pending ? (pendingText ?? "Waiting for sign-in…") : children}
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
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || pending}
      aria-busy={pending}
      className={cn(authButtonClass(variant), className)}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

type AuthButtonVariant = "primary" | "ghost" | "danger";

function authButtonClass(variant: AuthButtonVariant) {
  const tone =
    variant === "ghost"
      ? "border border-[var(--border2)] bg-transparent text-[var(--text)] hover:border-[var(--text3)] hover:bg-[var(--bg2)]"
      : variant === "danger"
        ? "bg-[var(--red)] text-white hover:bg-[var(--red-d)]"
        : "bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-d)]";
  return cn(
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius)] text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-55",
    tone
  );
}

// ── Navigating primary action ────────────────────────────────
// Same geometry as AuthButton, for actions that route instead of submit.

export function AuthLinkButton({
  to,
  children,
  variant = "primary",
  className,
}: {
  to: string;
  children: React.ReactNode;
  variant?: AuthButtonVariant;
  className?: string;
}) {
  return (
    <Link to={to} className={cn(authButtonClass(variant), className)}>
      {children}
    </Link>
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
  return <p className="mt-8 text-[13px] leading-[1.6] text-[var(--text2)]">{children}</p>;
}

// ── Quiet note ───────────────────────────────────────────────
// Secondary guidance ("links expire in 24 hours") as plain text, not a
// coloured notice box.

export function AuthNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[12px] leading-[1.6] text-[var(--text3)]", className)}>{children}</p>;
}

export function AuthLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-sm font-medium text-[var(--text)] underline decoration-[var(--border2)] underline-offset-4 transition-colors hover:decoration-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
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
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-[var(--text2)]">
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
