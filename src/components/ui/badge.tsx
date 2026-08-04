import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Status pills — sentinel-design.md §7.
 *
 * Always a tinted background + saturated text, pill radius, mono 10px
 * uppercase. Never outline-only.
 *   Active / Healthy → green · Firing / Error → red ·
 *   Paused / Degraded → amber · AI suggested → cyan (AI channel).
 */
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        /** Brand-filled — product actions/counters, not health. */
        default: "bg-[var(--brand)] text-[var(--brand-fg)]",
        /** Neutral meta pill. */
        secondary: "bg-[var(--bg2)] text-[var(--text2)]",
        /** Truth channel. */
        success: "bg-[var(--green-bg)] text-[var(--green)]",
        warning: "bg-[var(--amber-bg)] text-[var(--amber)]",
        destructive: "bg-[var(--red-bg)] text-[var(--red)]",
        info: "bg-[var(--blue-bg)] text-[var(--blue)]",
        series: "bg-[var(--violet-bg)] text-[var(--violet)]",
        /** AI channel — model output only. */
        ai: "bg-[var(--ai-bg)] text-[var(--ai)]",
        /** Brand tint. */
        brand: "bg-[var(--brand-bg)] text-[var(--brand)]",
        outline: "border-[var(--border2)] text-[var(--text2)]",
        ghost: "text-[var(--text3)] hover:bg-[var(--bg2)] hover:text-[var(--text2)]",
        link: "text-[var(--brand)] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
