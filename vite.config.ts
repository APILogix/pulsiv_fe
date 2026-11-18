import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
//
// React Compiler (rules.md §1) is wired through the react plugin's babel config
// so the compiler runs at build/dev time. With it enabled we do NOT write
// useMemo / useCallback / React.memo manually — the compiler handles it.
const isProd = process.env.NODE_ENV === "production";

export default defineConfig({
  plugins: [
    react(
      isProd
        ? {
            babel: {
              plugins: [["babel-plugin-react-compiler", { target: "19" }]],
            },
          }
        : undefined
    ),
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
  esbuild: {
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
    legalComments: "none",
  },
  build: {
    target: "es2022",
    cssCodeSplit: true,
    cssMinify: true,
    // A production build is a complete snapshot. Keeping old hashed chunks
    // creates stale deploy assets and makes build output grow on every run.
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    modulePreload: {
      polyfill: true,
      resolveDependencies(filename, deps, { hostType }) {
        if (hostType === 'html') {
          return deps.filter((dep) => {
            if (dep.includes('motion-vendor')) return false;
            if (dep.includes('map-vendor')) return false;
            if (dep.includes('radix-vendor')) return false;
            if (dep.includes('form-vendor')) return false;
            if (dep.includes('zod-vendor')) return false;
            if (dep.includes('authn-vendor')) return false;
            if (dep.includes('auth-profile')) return false;
            if (dep.includes('auth-shared')) return false;
            return true;
          });
        }
        return deps;
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');

          if (normalizedId.includes('node_modules')) {
            if (normalizedId.includes('/react/') || normalizedId.includes('/react-dom/') || normalizedId.includes('/scheduler/')) {
              return 'react-core';
            }
            if (normalizedId.includes('react-router')) {
              return 'router-vendor';
            }
            if (normalizedId.includes('framer-motion')) {
              return 'motion-vendor';
            }
            if (normalizedId.includes('lucide-react')) {
              return 'icons-vendor';
            }
            if (normalizedId.includes('radix-ui') || normalizedId.includes('@radix-ui')) {
              return 'radix-vendor';
            }
            if (normalizedId.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (normalizedId.includes('axios')) {
              return 'network-vendor';
            }
            if (normalizedId.includes('react-hook-form') || normalizedId.includes('@hookform')) {
              return 'form-vendor';
            }
            if (normalizedId.includes('zod')) {
              return 'zod-vendor';
            }
            if (normalizedId.includes('react-simple-maps') || normalizedId.includes('d3-')) {
              return 'map-vendor';
            }
            if (normalizedId.includes('@simplewebauthn')) {
              return 'authn-vendor';
            }
            if (normalizedId.includes('cmdk')) {
              return 'cmdk-vendor';
            }
            if (normalizedId.includes('sonner')) {
              return 'toast-vendor';
            }
          }

          if (normalizedId.includes('/src/shared/skeletons/')) {
            return 'skeletons';
          }

          if (normalizedId.includes('/src/modules/auth/store/')) {
            return 'auth-store';
          }
        },
      },
    },
  },
})
