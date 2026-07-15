import { Children, cloneElement, isValidElement, useId, type ReactElement } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

// Submit button — rules.md §4.4: always useFormStatus, never manual isSubmitting.
export function SubmitButton({ children, variant = "primary", className }: { children?: React.ReactNode; variant?: "primary" | "danger"; className?: string }) {
  const { pending } = useFormStatus();
  const tone = variant === "danger"
    ? "bg-[var(--red)] text-white hover:opacity-90"
    : "bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-d)]";
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={cn("inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] px-4 text-sm font-medium transition-colors disabled:opacity-60", tone, className)}>
      {pending ? "Saving…" : (children ?? "Save")}
    </button>
  );
}

export function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  const fieldId = useId();
  const control = Children.count(children) === 1 && isValidElement<{ id?: string }>(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, {
        id: children.props.id ?? fieldId,
      })
    : children;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-[12px] font-medium uppercase tracking-wider text-[var(--text3)]">{label}</label>
      {control}
      {hint && !error && <span className="text-[12px] text-[var(--text3)]">{hint}</span>}
      {error && <span className="text-[12px] text-[var(--red)]">{error}</span>}
    </div>
  );
}

export const inputClass =
  "h-9 w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--brand)]";

export const textareaClass =
  "min-h-[88px] w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] p-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--brand)]";
