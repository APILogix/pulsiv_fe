import { lazy, Suspense } from "react";
import { RouterProvider } from "react-router";
import { AppProviders } from "./providers/AppProviders";
import { router } from "./router/routes";
import { useAuthStore } from "@/modules/auth/store/auth.store";

const GlobalStepUpModal = lazy(() =>
  import("@/modules/auth/components/GlobalStepUpModal").then((m) => ({ default: m.GlobalStepUpModal }))
);

function App() {
  const stepUpPromise = useAuthStore((state) => state.stepUpPromise);

  return (
    <AppProviders>
      <RouterProvider router={router} />
      {stepUpPromise ? (
        <Suspense fallback={null}>
          <GlobalStepUpModal />
        </Suspense>
      ) : null}
    </AppProviders>
  );
}

export default App;

