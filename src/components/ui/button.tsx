import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Buttons — sentinel-design.md §7.
 *
 * primary   → brand fill, brand-fg text, 600 weight, hover → --brand-d
 *             (Indigo: indigo fill / white text · Mono: white fill / near-black text)
 * ghost     → transparent, 1px --border2, --text2; hover → border --text3, text --text
 * danger    → --red-bg fill, red border, --red text
 * ai        → --ai-bg fill, 1px --ai-d, --ai text — ONLY for model-suggested
 *             actions ("Apply fix", "Auto-scale", "Silence anomaly").
 *
 * Radius is 6px (--radius) for every button.
 *
 * Motion (Phase 8): colour fades stay at 150ms and the only movement is a 1%
 * press compression via `active:scale`. Hovers still never scale — the lift is
 * reserved for `AnimatedButton` on primary async actions — so dense toolbars
 * don't wobble under the cursor. `transform` is composited, so the press costs
 * nothing on the main thread.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius)] border border-transparent bg-clip-padding text-[13px] font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-150 ease-out outline-none select-none focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)] focus-visible:border-[var(--brand)] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-[var(--red)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand)] text-[var(--brand-fg)] font-semibold hover:bg-[var(--brand-d)]",
        outline:
          "border-[var(--border2)] bg-transparent text-[var(--text2)] hover:border-[var(--text3)] hover:text-[var(--text)] aria-expanded:border-[var(--text3)] aria-expanded:text-[var(--text)]",
        secondary:
          "bg-[var(--bg2)] text-[var(--text)] hover:bg-[var(--bg3)] aria-expanded:bg-[var(--bg3)]",
        ghost:
          "bg-transparent text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)] aria-expanded:bg-[var(--bg2)] aria-expanded:text-[var(--text)]",
        destructive:
          "border-[rgba(239,68,68,0.35)] bg-[var(--red-bg)] text-[var(--red)] hover:bg-[rgba(239,68,68,0.16)] focus-visible:ring-[var(--red-bg)] focus-visible:border-[var(--red)]",
        /** Destructive confirm inside modals — solid red. */
        "destructive-solid":
          "bg-[var(--red)] text-white font-semibold hover:bg-[var(--red-d)]",
        /** AI channel action. Reserved for model-suggested actions only (§7). */
        ai: "border-[var(--ai-d)] bg-[var(--ai-bg)] text-[var(--ai)] hover:bg-[var(--ai)] hover:text-[var(--ai-fg)] focus-visible:ring-[var(--ai-bg)] focus-visible:border-[var(--ai)]",
        link: "text-[var(--brand)] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 px-2 text-[11px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 px-2.5 text-[12px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 px-3.5",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
