import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
//
// React Compiler (rules.md §1) is wired through the react plugin's babel config
// so the compiler runs at build/dev time. With it enabled we do NOT write
// useMemo / useCallback / React.memo manually — the compiler handles it.
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", { target: "19" }]],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      "lucide-react",
      "react",
      "react-dom",
      "react-router",
      "clsx",
      "sonner",
      "cmdk",
      "zustand",
      "@tanstack/react-query",
      "axios",
      "zod",
    ],
  },
})
