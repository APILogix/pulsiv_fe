import { AlertTriangle, CreditCard, Lock, ServerOff, WifiOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyPanel, Notice } from "@/shared/ui/pulse";
import { Button } from "@/shared/observe";
import { normalizeAiError } from "../lib/errors";

/**
 * Renders the right surface for a failed AI query. Distinguishes plan locks,
 * credit exhaustion, and capabilities the backend does not expose yet from
 * generic transport errors, so the user always sees an honest state.
 */
export function AiErrorState({
  error,
  title,
  onRetry,
  unavailableTitle,
  unavailableDescription,
}: {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  unavailableTitle?: string;
  unavailableDescription?: string;
}) {
  const normalized = normalizeAiError(error);

  if (normalized.unavailable) {
    return (
      <EmptyPanel
        icon={ServerOff}
        title={unavailableTitle ?? "Not available yet"}
        description={
          unavailableDescription ??
          "This capability isn't exposed by the connected environment yet. It will populate automatically once the service is enabled."
        }
      />
    );
  }

  if (normalized.locked) {
    return (
      <Notice icon={Lock} tone="amber" title="Not included in your plan">
        {normalized.message} Contact your administrator to enable AI features for this organization.
      </Notice>
    );
  }

  if (normalized.outOfCredits) {
    return (
      <Notice icon={CreditCard} tone="amber" title="Out of AI credits">
        {normalized.message} Top up credits or adjust budgets in AI Settings.
      </Notice>
    );
  }

  return (
    <Notice
      icon={normalized.status ? AlertTriangle : WifiOff}
      tone="red"
      title={title ?? "Something went wrong"}
      action={
        onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        ) : undefined
      }
    >
      {normalized.message}
    </Notice>
  );
}

export function AiLoadingBlock({ rows = 3 }: { rows?: number }) {
  const keys = Array.from({ length: rows }, (_, i) => `sk-${i}`);
  return (
    <div className="flex flex-col gap-3">
      {keys.map((k) => (
        <div key={k} className="flex flex-col gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}
