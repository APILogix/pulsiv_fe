import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Buttons — newdesign.md §15.
 *
 * default   → Off-white fill (#F4F5F7), dark text (#08090A), 500 weight, hover #FFFFFF
 * brand     → Brand purple fill (#8B7CF6), white text, hover #9B8DFF
 * outline   → Transparent, 1px --border-default, --text-secondary; hover --surface-2, text --text-primary
 * secondary → --surface-2 fill, --text-primary; hover --surface-3
 * ghost     → Transparent, --text-secondary; hover --surface-2, text --text-primary
 * destructive → --error-muted fill, --error-border border, --error text
 * ai        → --ai-bg fill, --info-border border, --info text
 *
 * Radius is 6px (--radius-sm) for all buttons.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-transparent bg-clip-padding text-[13px] font-medium whitespace-nowrap transition-colors duration-150 ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-[var(--brand-muted)] focus-visible:border-[var(--brand)] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-[var(--error)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--text-primary)] text-[var(--color-canvas)] font-medium hover:bg-white active:bg-[var(--text-secondary)] shadow-none",
        brand:
          "bg-[var(--brand)] text-white font-medium hover:bg-[var(--brand-hover)] active:bg-[var(--brand-d)] shadow-none",
        outline:
          "border-[var(--border-default)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] aria-expanded:border-[var(--border-strong)] aria-expanded:bg-[var(--surface-2)] aria-expanded:text-[var(--text-primary)]",
        secondary:
          "border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--surface-3)] hover:border-[var(--border-default)] aria-expanded:bg-[var(--surface-3)]",
        ghost:
          "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] aria-expanded:bg-[var(--surface-2)] aria-expanded:text-[var(--text-primary)]",
        destructive:
          "border border-[var(--error-border)] bg-[var(--error-muted)] text-[var(--error)] hover:bg-[rgba(240,93,94,0.18)] focus-visible:ring-[var(--error-muted)] focus-visible:border-[var(--error)]",
        "destructive-solid":
          "bg-[var(--error)] text-white font-medium hover:bg-[var(--red-d)]",
        ai: "border border-[var(--info-border)] bg-[var(--ai-bg)] text-[var(--info)] hover:bg-[rgba(94,167,245,0.18)] focus-visible:ring-[var(--ai-bg)] focus-visible:border-[var(--info)]",
        link: "text-[var(--brand)] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 px-3 text-[13px] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 px-2 text-[11px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 px-2.5 text-[12px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 px-3.5 text-[14px]",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
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

