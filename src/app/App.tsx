import { RouterProvider } from "react-router";
import { AppProviders } from "./providers/AppProviders";
import { router } from "./router/routes";
import { GlobalStepUpModal } from "@/modules/auth/components/GlobalStepUpModal";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import { AppBootstrapGate } from "@/shared/ui/loading";

function App() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  return (
    <AppProviders>
      {hasHydrated ? (
        <>
          <RouterProvider router={router} />
          <GlobalStepUpModal />
        </>
      ) : (
        <AppBootstrapGate visible={true} />
      )}
    </AppProviders>
  );
}

export default App;

