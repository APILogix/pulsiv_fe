import { Sliders, RefreshCw } from "lucide-react";
import { Button } from "@/shared/observe";

interface RemoteConfigEmptyStateProps {
  environmentName: string;
  onResetScope?: () => void;
}

export function RemoteConfigEmptyState({
  environmentName,
  onResetScope,
}: RemoteConfigEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--bg1)] px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg2)] text-[var(--text2)] mb-4">
        <Sliders className="size-6" />
      </div>
      <h3 className="font-[family-name:var(--display)] text-base font-semibold text-[var(--text)]">
        No Configuration Found for {environmentName}
      </h3>
      <p className="mt-2 max-w-md text-xs leading-relaxed text-[var(--text3)]">
        Remote configuration allows your team to dynamically adjust telemetry ingestion, sampling rates, PII masking rules, and killswitches across running SDK instances without redeploying code.
      </p>
      {onResetScope && (
        <div className="mt-6 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onResetScope}
            className="h-8 gap-1.5 border border-[var(--border)] text-xs text-[var(--text2)] hover:text-[var(--text)]"
          >
            <RefreshCw className="size-3.5" />
            Switch to All Environments
          </Button>
        </div>
      )}
    </div>
  );
}
