import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-[13px] leading-[1.5] text-[var(--text)] transition-colors outline-none placeholder:text-[var(--text3)] focus-visible:border-[var(--brand)] focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--red)] aria-invalid:ring-3 aria-invalid:ring-[var(--red-bg)]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
