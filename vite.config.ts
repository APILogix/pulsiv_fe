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
  server: {
    host: true,
    watch: {
      ignored: ["**/dist/**", "**/.git/**"],
    },
    headers: {
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    },
  },
  preview: {
    host: true,
    headers: {
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    },
  },
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
  build: {
    target: "es2022",
    cssCodeSplit: true,
    emptyOutDir: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
              return 'react-core';
            }
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            if (id.includes('framer-motion')) {
              return 'motion-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            if (id.includes('react-simple-maps') || id.includes('d3-')) {
              return 'map-vendor';
            }
            if (id.includes('countries-and-timezones')) {
              return 'countries-vendor';
            }
            if (id.includes('@simplewebauthn')) {
              return 'authn-vendor';
            }
            if (id.includes('cmdk')) {
              return 'cmdk-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
          }
        },
      },
    },
  },
})
