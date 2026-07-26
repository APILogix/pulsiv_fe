import { AppBootstrapLoader } from "@/shared/ui/loading";

/** @deprecated Prefer AppBootstrapLoader for new call sites. */
export function LoadingScreen({ message = "Loading application" }: { message?: string }) {
  return <AppBootstrapLoader message={message} />;
}
