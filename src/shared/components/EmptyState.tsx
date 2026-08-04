import type { ReactNode } from "react";

import { AnimatedEmptyState, type EmptyIllustration } from "@/shared/motion";

/**
 * Shared empty state.
 *
 * Kept backward compatible with the original `<EmptyState message="…" />` call
 * signature — existing call sites now get an illustration and entrance for free
 * (Phase 5) — while new call sites can pass a domain illustration and a CTA.
 */
export function EmptyState({
  message,
  title,
  illustration = "inbox",
  action,
  compact = true,
}: {
  message: string;
  /** Headline. When omitted, `message` is promoted to the headline. */
  title?: string;
  illustration?: EmptyIllustration;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <AnimatedEmptyState
      illustration={illustration}
      title={title ?? message}
      description={title ? message : undefined}
      action={action}
      compact={compact}
    />
  );
}
