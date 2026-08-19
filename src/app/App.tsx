import { useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import { AppProviders } from "./providers/AppProviders";
import { router } from "./router/routes";
import { GlobalStepUpModal } from "@/modules/auth/components/GlobalStepUpModal";
import { useAuthStore } from "@/modules/auth/store/auth.store";

function App() {
  const [, setHydrated] = useState(() => {
    return typeof window !== "undefined" ? useAuthStore.persist?.hasHydrated?.() ?? true : true;
  });

  useEffect(() => {
    if (useAuthStore.persist?.hasHydrated?.()) {
      setHydrated(true);
      useAuthStore.getState().setHasHydrated(true);
    }
    const unsub = useAuthStore.persist?.onFinishHydration?.(() => {
      setHydrated(true);
      useAuthStore.getState().setHasHydrated(true);
    });
    return () => unsub?.();
  }, []);

  return (
    <AppProviders>
      <RouterProvider router={router} />
      <GlobalStepUpModal />
    </AppProviders>
  );
}

export default App;

