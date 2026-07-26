import { useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import { AppProviders } from "./providers/AppProviders";
import { router } from "./router/routes";
import { GlobalStepUpModal } from "@/modules/auth/components/GlobalStepUpModal";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import { AppBootstrapLoader } from "@/shared/ui/loading";

const MINIMUM_RELOAD_LOADER_MS = 1400;

function App() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [minimumElapsed, setMinimumElapsed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumElapsed(true), MINIMUM_RELOAD_LOADER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const ready = hasHydrated && minimumElapsed;
  return (
    <AppProviders>
      {ready ? (
        <><RouterProvider router={router} /><GlobalStepUpModal /></>
      ) : (
        <AppBootstrapLoader />
      )}
    </AppProviders>
  );
}

export default App;
