import { Sheet, SheetError } from "@/modules/projects/components/project-page";

interface RemoteConfigErrorStateProps {
  error?: Error | null;
  onRetry: () => void;
}

export function RemoteConfigErrorState({ error, onRetry }: RemoteConfigErrorStateProps) {
  return (
    <Sheet label="Remote config">
      <SheetError
        title="Could not load remote config"
        message={
          error?.message ||
          "The remote configuration service could not be reached. Your connected SDKs will continue operating using cached configuration."
        }
        onRetry={onRetry}
      />
    </Sheet>
  );
}
