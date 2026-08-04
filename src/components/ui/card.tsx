import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Cards — sentinel-design.md §7.
 * --bg1 surface · 10px radius (--radius-lg) · 1px solid --border · 16–24px
 * padding. A card carries a hairline border OR a tiny shadow, never both
 * heavily (§6). Borders are what hold Mono together — never remove them.
 *
 * `interactive` opts a card into hover elevation (Phase 8). It is opt-in rather
 * than default because most cards in this app are read-only panels, and a panel
 * that lifts under the cursor promises a click that isn't there.
 */
function Card({
  className,
  size = "default",
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm"; interactive?: boolean }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-interactive={interactive || undefined}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] py-(--card-spacing) text-[13px] text-[var(--text)] [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0",
        interactive &&
          "transition-[transform,border-color,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:border-[var(--border2)] hover:shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--brand)_28%,transparent)] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-[15px] leading-snug font-semibold text-[var(--text)] group-data-[size=sm]/card:text-[14px]",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-[13px] leading-[1.5] text-[var(--text2)]", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t border-[var(--border)] bg-[var(--bg2)]/60 p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
