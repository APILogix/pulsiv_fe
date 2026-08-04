/**
 * Small composition helpers shared by the project surfaces.
 *
 * Everything here sits on top of `@/shared/ui/pulse` and `@/shared/observe`
 * so project pages stay declarative and visually consistent.
 */
import { useState, type ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button as UiButton } from "@/components/ui/button";
import { Notice, Panel, Toggle } from "@/shared/ui/pulse";
import {
  WorkflowInline,
  type WorkflowState,
  type WorkflowStepDef,
} from "@/shared/motion";
import { cn } from "@/lib/utils";

// ── Form dialog ──────────────────────────────────────────────
// Uncontrolled inputs + native form submit, so callers read values from
// FormData and never re-render per keystroke (rules.md §8.2).

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "Save",
  pending,
  error,
  onSubmit,
  children,
  width = "sm:max-w-[560px]",
  workflowSteps,
  workflowState,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel?: string;
  pending?: boolean;
  error?: string | null;
  onSubmit: (form: FormData) => void;
  children: ReactNode;
  width?: string;
  /**
   * Optional multi-step narration (Phase 4). Pass both to replace the plain
   * pending spinner with a step list while the request is in flight — for
   * operations that genuinely do more than one thing server-side.
   */
  workflowSteps?: readonly WorkflowStepDef[];
  workflowState?: WorkflowState;
}) {
  const narrating = Boolean(workflowSteps && workflowState && workflowState.status !== "idle");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={width}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(new FormData(event.currentTarget));
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-0.5 sidebar-scroll">{children}</div>
          {narrating && workflowSteps && workflowState && (
            <WorkflowInline steps={workflowSteps} state={workflowState} />
          )}
          {error && !narrating && (
            <Notice tone="red" icon={AlertTriangle}>
              {error}
            </Notice>
          )}
          <DialogFooter>
            <UiButton type="button" variant="ghost" size="lg" onClick={() => onOpenChange(false)}>
              Cancel
            </UiButton>
            <UiButton type="submit" size="lg" disabled={pending}>
              {pending && !narrating && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              {submitLabel}
            </UiButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Confirm dialog ───────────────────────────────────────────

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = true,
  pending,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <UiButton variant="ghost" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </UiButton>
          <UiButton
            variant={destructive ? "destructive" : "default"}
            size="lg"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {confirmLabel}
          </UiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Labeled field for dialogs ────────────────────────────────

export const dialogInputClass =
  "h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-3 text-[13px] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text3)] hover:border-[var(--border2)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-bg)]";

export const dialogTextareaClass =
  "min-h-[80px] w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] p-3 text-[13px] leading-[1.5] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text3)] hover:border-[var(--border2)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-bg)]";

export function DialogField({
  label,
  name,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  name?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={name} className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">
        {label}
        {required && <span className="ml-1 text-[var(--red)]">*</span>}
      </label>
      {children}
      {hint && <span className="text-[11px] leading-snug text-[var(--text3)]">{hint}</span>}
    </div>
  );
}

/**
 * Extract a human message from an axios error, preferring the backend's
 * `{ error: { code, message } }` envelope over the generic HTTP message.
 */
export function apiErrorMessage(error: unknown, fallback = "Request failed."): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;

  const response = (error as { response?: { data?: { error?: unknown; message?: unknown } } }).response;
  const dataError = response?.data?.error;
  const dataMsg = response?.data?.message;

  if (typeof dataError === "string" && dataError.length > 0) return dataError;
  if (dataError && typeof dataError === "object") {
    if ("message" in dataError && typeof (dataError as any).message === "string" && (dataError as any).message.length > 0) {
      return (dataError as any).message;
    }
  }

  if (typeof dataMsg === "string" && dataMsg.length > 0) return dataMsg;

  if (error instanceof Error) {
    if (typeof error.message === "string" && error.message.length > 0) {
      return error.message;
    }
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as any).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }

  return fallback;
}

/** Comma/newline separated text → trimmed string array. */
export function parseList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function optionalNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function optionalText(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

// ── Inline toggle row inside a panel ─────────────────────────

export function TogglePanelRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 px-5 py-3.5">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[var(--text)]">{label}</p>
        {description && <p className="mt-0.5 text-[12px] leading-snug text-[var(--text2)]">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} disabled={disabled} />
    </div>
  );
}

// ── Async panel wrapper ──────────────────────────────────────
// Renders loading / error / empty states so pages avoid the same triage
// boilerplate on every list surface.

export function AsyncPanel({
  title,
  description,
  icon,
  actions,
  loading,
  error,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  children,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  loading?: boolean;
  error?: unknown;
  isEmpty?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  let body: ReactNode = children;
  // Loading/error/empty states supply their own spacing, so the caller's
  // body class (often `p-0` for edge-to-edge tables) must not apply to them.
  let stateBody = false;

  if (loading) {
    stateBody = true;
    body = (
      <div className="flex flex-col gap-2 py-1">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="loading-skeleton h-9 rounded-[var(--radius)] bg-[var(--bg2)]" />
        ))}
      </div>
    );
  } else if (error) {
    stateBody = true;
    body = (
      <Notice tone="red" icon={AlertTriangle} title="Could not load this section">
        {(error as Error)?.message ?? "Unexpected error."}
      </Notice>
    );
  } else if (isEmpty) {
    stateBody = true;
    const EmptyIcon = emptyIcon ?? AlertTriangle;
    body = (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-[var(--bg2)] text-[var(--text3)] ring-1 ring-inset ring-[var(--border)]">
          <EmptyIcon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[14px] font-semibold text-[var(--text)]">{emptyTitle ?? "Nothing here yet"}</p>
          {emptyDescription && (
            <p className="mt-1 max-w-[46ch] text-[12px] leading-[1.5] text-[var(--text2)]">
              {emptyDescription}
            </p>
          )}
        </div>
        {emptyAction}
      </div>
    );
  }

  return (
    <Panel
      title={title}
      description={description}
      icon={icon}
      actions={actions}
      bodyClassName={stateBody ? undefined : bodyClassName}
    >
      {body}
    </Panel>
  );
}

// ── One-time secret reveal ───────────────────────────────────

export function useRevealedSecret() {
  const [secret, setSecret] = useState<{ value: string; label: string } | null>(null);
  return { secret, setSecret, clear: () => setSecret(null) };
}
