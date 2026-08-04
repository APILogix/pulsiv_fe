import { cn } from "@/lib/utils"

/**
 * Skeleton — sentinel-design.md §9. Loading uses skeleton blocks, never page
 * spinners. Base surface is --bg2; add `shimmer` for the cyan AI-analyzing
 * sweep (AI channel only).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("loading-skeleton rounded-[var(--radius)] bg-[var(--bg2)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
