import { RouterProvider } from "react-router"
import { AppProviders } from "./providers/AppProviders"
import { router } from "./router/routes"
import { GlobalStepUpModal } from "@/modules/auth/components/GlobalStepUpModal"

function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <GlobalStepUpModal />
    </AppProviders>
  )
}

export default App
