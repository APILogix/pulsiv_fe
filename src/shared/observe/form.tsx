import { Children, cloneElement, isValidElement, useId, type ReactElement } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Form primitives — sentinel-design.md §7.
 * Primary button: brand fill + --brand-fg text, 600 weight, radius 6px,
 * hover → --brand-d. Danger confirm: solid --red with white text.
 * Inputs: 36px, --bg2, 1px --border, focus → brand border + 3px brand-bg ring.
 */

// Submit button — rules.md §4.4: always useFormStatus, never manual isSubmitting.
export function SubmitButton({ children, variant = "primary", className }: { children?: React.ReactNode; variant?: "primary" | "danger"; className?: string }) {
  const { pending } = useFormStatus();
  const tone = variant === "danger"
    ? "bg-[var(--red)] text-white hover:bg-[var(--red-d)]"
    : "bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-d)]";
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius)] px-4 text-[13px] font-semibold transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)] disabled:opacity-60",
        tone,
        className,
      )}
    >
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
      <label htmlFor={fieldId} className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">{label}</label>
      {control}
      {hint && !error && <span className="text-[12px] text-[var(--text3)]">{hint}</span>}
      {error && <span className="text-[12px] text-[var(--red)]">{error}</span>}
    </div>
  );
}

export const inputClass =
  "h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-3 text-[13px] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text3)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-bg)] disabled:opacity-50";

export const textareaClass =
  "min-h-[88px] w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] p-3 text-[13px] leading-[1.5] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text3)] focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-bg)] disabled:opacity-50";

/** Ghost button (§7): transparent, --border2 hairline, --text2. */
export const ghostButtonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius)] border border-[var(--border2)] bg-transparent px-3.5 text-[13px] font-medium text-[var(--text2)] transition-colors duration-150 outline-none hover:border-[var(--text3)] hover:text-[var(--text)] focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)] disabled:opacity-50";

/** AI action button (§7). Model-suggested actions only — never product chrome. */
export const aiButtonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius)] border border-[var(--ai-d)] bg-[var(--ai-bg)] px-3.5 text-[13px] font-medium text-[var(--ai)] transition-colors duration-150 outline-none hover:bg-[var(--ai)] hover:text-[var(--ai-fg)] focus-visible:ring-3 focus-visible:ring-[var(--ai-bg)] disabled:opacity-50";
