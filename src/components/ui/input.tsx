import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Inputs — sentinel-design.md §7.
 * 36px tall · --bg2 fill · 1px --border · radius 6px · no inner shadow ·
 * placeholder --text3 · focus → border --brand + 3px --brand-bg ring.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1 text-[13px] text-[var(--text)] transition-colors outline-none",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-[12px] file:font-medium file:text-[var(--text)]",
        "placeholder:text-[var(--text3)]",
        "focus-visible:border-[var(--brand)] focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-[var(--red)] aria-invalid:ring-3 aria-invalid:ring-[var(--red-bg)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
