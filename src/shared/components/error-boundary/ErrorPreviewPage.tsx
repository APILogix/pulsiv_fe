import { useState } from 'react';
import { AppErrorFallback, AppErrorBoundary } from './AppErrorBoundary';
import { Button } from '@/components/ui/button';
import { SentinelLogoMark, StatusPill } from '@/shared/ui/sentinel';
import { Terminal, RefreshCcw, Layers, Laptop, Globe, Flame } from 'lucide-react';

const MOCK_ERRORS = {
  typeError: {
    label: 'TypeError (Unchecked property access)',
    error: (() => {
      const err = new TypeError("Cannot read properties of undefined (reading 'rateLimitTier')");
      err.stack = `TypeError: Cannot read properties of undefined (reading 'rateLimitTier')
    at ProjectOverviewMetrics (http://localhost:5173/src/pages/workspaces/ProjectOverviewPage.tsx:142:32)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js:11540:22)
    at mountIndeterminateComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js:14922:17)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js:15904:20)
    at HTMLUnknownElement.callCallback (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js:3671:18)
    at Object.invokeGuardedCallbackDev (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js:3696:20)
    at invokeGuardedCallback (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js:3730:35)
    at beginWork$1 (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js:19761:32)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js:19194:16)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js:19133:9)`;
      return err;
    })(),
  },
  chunkError: {
    label: 'ChunkLoadError (New build deployment)',
    error: (() => {
      const err = new Error("Loading chunk 8492 failed: Failed to fetch dynamically imported module: http://localhost:5173/assets/DashboardsOverview-Cz409a.js");
      err.name = 'ChunkLoadError';
      err.stack = `ChunkLoadError: Loading chunk 8492 failed.
    at async importModule (http://localhost:5173/node_modules/.vite/deps/react-router.js:489:12)
    at async loadRouteChunks (http://localhost:5173/src/app/router/protected-routes.tsx:40:15)
    at async dataRoutesLoader (http://localhost:5173/node_modules/.vite/deps/react-router.js:2910:22)`;
      return err;
    })(),
  },
  gatewayError: {
    label: 'HTTP 502 Bad Gateway (Upstream failure)',
    error: {
      status: 502,
      statusText: 'Bad Gateway',
      data: 'The upstream Sentinel API ingestion cluster timed out after 30000ms while evaluating query partitions.',
    },
  },
  networkError: {
    label: 'Network Disconnection (Offline / dropped link)',
    error: (() => {
      const err = new Error("Failed to fetch: net::ERR_INTERNET_DISCONNECTED");
      err.name = 'TypeError';
      err.stack = `TypeError: Failed to fetch: net::ERR_INTERNET_DISCONNECTED
    at fetchWithRetry (http://localhost:5173/src/lib/api-client.ts:88:14)
    at async queryFn (http://localhost:5173/src/modules/projects/hooks/useProjectTelemetry.ts:24:9)
    at async fetchOptimisticData (http://localhost:5173/node_modules/@tanstack/react-query/build/modern/index.js:1420:11)`;
      return err;
    })(),
  },
};

/** A component that simulates an active crash inside AppErrorBoundary */
function CrashingComponent({ shouldCrash }: { shouldCrash: boolean }) {
  if (shouldCrash) {
    throw new TypeError("Simulated runtime exception inside live child boundary");
  }
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] p-6 text-center">
      <p className="text-sm font-medium text-[var(--green)]">Child component rendered successfully without error!</p>
    </div>
  );
}

export default function ErrorPreviewPage() {
  const [selectedKey, setSelectedKey] = useState<keyof typeof MOCK_ERRORS>('typeError');
  const [isRootRoute, setIsRootRoute] = useState(false);
  const [liveCrash, setLiveCrash] = useState(false);

  const selectedMock = MOCK_ERRORS[selectedKey];

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)] font-[family-name:var(--sans)]">
      {/* Dev Control Toolbar */}
      <div className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg1)]/90 backdrop-blur-md px-6 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SentinelLogoMark size={20} />
            <span className="font-[family-name:var(--display)] text-sm font-semibold tracking-[-0.01em]">
              Sentinel Error Boundary Playground
            </span>
            <span className="text-[var(--border2)]">|</span>
            <span className="text-xs text-[var(--text3)]">Verification Console</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--text3)] mr-1">Scenario:</span>
            {(Object.keys(MOCK_ERRORS) as (keyof typeof MOCK_ERRORS)[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setSelectedKey(k);
                  setLiveCrash(false);
                }}
                className={`text-xs px-2.5 py-1 rounded-[var(--radius)] border transition-colors cursor-pointer ${
                  selectedKey === k && !liveCrash
                    ? 'bg-[var(--brand)] text-[var(--brand-fg)] font-semibold border-[var(--brand)]'
                    : 'border-[var(--border)] bg-[var(--bg2)] text-[var(--text2)] hover:border-[var(--text3)] hover:text-[var(--text)]'
                }`}
              >
                {k === 'typeError' ? 'TypeError' : k === 'chunkError' ? 'ChunkLoad' : k === 'gatewayError' ? 'HTTP 502' : 'Offline'}
              </button>
            ))}

            <span className="text-[var(--border2)] mx-1">|</span>

            {/* Layout switch */}
            <button
              type="button"
              onClick={() => setIsRootRoute((r) => !r)}
              className={`text-xs px-2.5 py-1 rounded-[var(--radius)] border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                isRootRoute
                  ? 'bg-[var(--bg3)] text-[var(--text)] border-[var(--text3)]'
                  : 'bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)]'
              }`}
            >
              <Globe className="size-3" />
              <span>{isRootRoute ? 'Root Route Layout' : 'Embedded Shell Layout'}</span>
            </button>

            {/* Live crash trigger */}
            <button
              type="button"
              onClick={() => setLiveCrash(true)}
              className={`text-xs px-2.5 py-1 rounded-[var(--radius)] border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                liveCrash
                  ? 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]'
                  : 'bg-[var(--bg2)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--red)]'
              }`}
            >
              <Flame className="size-3 text-[var(--red)]" />
              <span>Simulate Live Crash</span>
            </button>
          </div>
        </div>
      </div>

      {/* Render Region */}
      <div className="w-full">
        {liveCrash ? (
          <div className="max-w-4xl mx-auto p-6">
            <div className="mb-4 flex items-center justify-between text-xs text-[var(--text3)]">
              <span>Wrapping child in &lt;AppErrorBoundary&gt;:</span>
              <button
                type="button"
                onClick={() => setLiveCrash(false)}
                className="underline hover:text-[var(--text)] cursor-pointer"
              >
                Clear crash state
              </button>
            </div>
            <AppErrorBoundary>
              <CrashingComponent shouldCrash={liveCrash} />
            </AppErrorBoundary>
          </div>
        ) : (
          <AppErrorFallback
            error={selectedMock.error}
            resetErrorBoundary={() => alert('Reset boundary triggered!')}
            isRootRoute={isRootRoute}
          />
        )}
      </div>
    </div>
  );
}
