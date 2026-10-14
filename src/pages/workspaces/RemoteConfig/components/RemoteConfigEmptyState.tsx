import { Sheet, SheetEmpty } from "@/modules/projects/components/project-page";
import { Button as UiButton } from "@/components/ui/button";

interface RemoteConfigEmptyStateProps {
  environmentName: string;
  onResetScope?: () => void;
}

export function RemoteConfigEmptyState({ environmentName, onResetScope }: RemoteConfigEmptyStateProps) {
  return (
    <Sheet label="Remote config">
      <SheetEmpty
        title={`No configuration for ${environmentName}`}
        description="Remote config lets your team adjust telemetry ingestion, sampling rates, PII masking, and killswitches across running SDK instances without redeploying code."
        action={
          onResetScope ? (
            <UiButton variant="outline" size="lg" onClick={onResetScope}>
              Show all environments
            </UiButton>
          ) : undefined
        }
      />
    </Sheet>
  );
}
