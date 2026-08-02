import { useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import { AppProviders } from "./providers/AppProviders";
import { router } from "./router/routes";
import { GlobalStepUpModal } from "@/modules/auth/components/GlobalStepUpModal";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import { AppBootstrapGate } from "@/shared/ui/loading";

/**
 * Cold-start floor. Long enough for the boot narration to read as a sequence
 * rather than a flicker, short enough that it never becomes the bottleneck on a
 * warm cache. Hydration usually finishes well inside this window.
 */
const MINIMUM_RELOAD_LOADER_MS = 1200;

function App() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [minimumElapsed, setMinimumElapsed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumElapsed(true), MINIMUM_RELOAD_LOADER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const ready = hasHydrated && minimumElapsed;

  /**
   * The router mounts as soon as we're ready and the loader stays on top for one
   * exit animation (Phase 2: "must fade naturally into the dashboard, never
   * disappear abruptly"). Because the gate is a sibling rather than a branch,
   * the dashboard is already painted underneath by the time the fade starts —
   * the handoff costs no extra wait.
   */
  return (
    <AppProviders>
      {ready && (
        <>
          <RouterProvider router={router} />
          <GlobalStepUpModal />
        </>
      )}
      <AppBootstrapGate visible={!ready} />
    </AppProviders>
  );
}

export default App;
