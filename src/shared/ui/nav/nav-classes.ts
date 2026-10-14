import { cn } from "@/lib/utils";

/**
 * Shared class recipes for the inner (flyout) sidebar.
 *
 * The module flyout and the in-project section render the same kind of rows,
 * so they read from one recipe instead of drifting apart. Everything resolves
 * to theme tokens; there are no literal colours here.
 */

/** Collapsible group heading: a quiet sentence-case label, never mono caps. */
export function navGroupHeaderClass(expanded: boolean) {
  return cn(
    "group/nav-heading flex h-7 w-full items-center justify-between gap-2 rounded-[var(--radius)] px-2.5",
    "text-[12px] font-medium tracking-[-0.005em] transition-colors duration-150",
    "hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]",
    expanded ? "text-[var(--text2)]" : "text-[var(--text3)]",
  );
}

/** Chevron beside a group heading. Rotates open; hidden from assistive tech. */
export function navGroupChevronClass(expanded: boolean) {
  return cn(
    "size-3.5 shrink-0 text-[var(--text3)] transition-transform duration-200 ease-out motion-reduce:transition-none",
    "group-hover/nav-heading:text-[var(--text2)]",
    expanded && "rotate-90",
  );
}

/** A navigable row: icon + label, with a token-driven active state. */
export function navRowClass(active: boolean) {
  return cn(
    "group/nav-row relative flex h-8 items-center gap-2.5 rounded-[var(--radius)] px-2.5 no-underline",
    "text-[13px] leading-none transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]",
    active
      ? "bg-[var(--brand-bg)] font-medium text-[var(--text)]"
      : "text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]",
  );
}

/** Row icon. Dims at rest so labels lead; lights with the row. */
export function navRowIconClass(active: boolean) {
  return cn(
    "size-4 shrink-0 stroke-[1.75] transition-colors duration-150",
    active ? "text-[var(--text)]" : "text-[var(--text3)] group-hover/nav-row:text-[var(--text2)]",
  );
}
