import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/shared/observe";

interface RemoteConfigErrorStateProps {
  error?: Error | null;
  onRetry: () => void;
}

export function RemoteConfigErrorState({
  error,
  onRetry,
}: RemoteConfigErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--red)]/30 bg-[var(--red-bg)] px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-[var(--red)]/40 bg-[var(--red)]/10 text-[var(--red)] mb-4">
        <AlertTriangle className="size-6" />
      </div>
      <h3 className="font-[family-name:var(--display)] text-base font-semibold text-[var(--red)]">
        Unable to Load Remote Configuration
      </h3>
      <p className="mt-2 max-w-md text-xs leading-relaxed text-[var(--text2)]">
        {error?.message || "The remote configuration service could not be reached. Your connected SDKs will continue operating using cached configuration."}
      </p>
      <div className="mt-6">
        <Button
          type="button"
          onClick={onRetry}
          className="h-8 gap-1.5 rounded-[var(--radius)] bg-[var(--red)] px-3 text-xs font-semibold text-white hover:bg-[var(--red-d)]"
        >
          <RotateCcw className="size-3.5" />
          Retry Connection
        </Button>
      </div>
    </div>
  );
}
