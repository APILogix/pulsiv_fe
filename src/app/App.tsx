import { lazy, Suspense } from "react";
import { RouterProvider } from "react-router";
import { AppProviders } from "./providers/AppProviders";
import { router } from "./router/routes";
import { useAuthStore } from "@/modules/auth/store/auth.store";

const GlobalStepUpModal = lazy(() =>
  import("@/modules/auth/components/GlobalStepUpModal").then((m) => ({ default: m.GlobalStepUpModal }))
);

/**
 * GlobalStepUpGate
 *
 * Decoupled step-up modal gate.
 * Only mounts and loads the lazy GlobalStepUpModal component when an active
 * step-up verification is required (i.e. stepUpPromise is non-null).
 * Isolating the store subscription here ensures the root App component and its
 * provider hierarchy do not re-render during step-up state transitions.
 */
function GlobalStepUpGate() {
  const hasStepUp = useAuthStore((state) => !!state.stepUpPromise);

  if (!hasStepUp) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <GlobalStepUpModal />
    </Suspense>
  );
}

function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <GlobalStepUpGate />
    </AppProviders>
  );
}

export default App;

