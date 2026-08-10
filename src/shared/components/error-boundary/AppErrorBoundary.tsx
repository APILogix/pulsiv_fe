import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { useRouteError, isRouteErrorResponse } from 'react-router';
import { AlertTriangle, Terminal, RefreshCcw, Home } from 'lucide-react';
import NotFoundPage from '@/shared/components/NotFoundPage';

function AppErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen w-full bg-[var(--bg)] flex flex-col items-start justify-start p-8 relative overflow-hidden font-[family-name:var(--sans)] text-[var(--text)] selection:bg-[var(--red-bg)] selection:text-[var(--red)]">
      {/* Top red bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[var(--red)]" />
      
      <div className="w-full max-w-5xl flex flex-col items-start gap-6 border-l border-[var(--border)] pl-8 py-8 mt-12 relative">
        {/* Decorative corner indicator */}
        <div className="absolute top-0 -left-[5px] w-2 h-2 bg-[var(--red)]" />

        <div className="flex items-center gap-3 text-[var(--red)]">
          <AlertTriangle className="h-6 w-6 stroke-[1.5]" />
          <h1 className="font-[family-name:var(--display)] text-[22px] font-semibold tracking-[-0.02em]">
            Critical exception
          </h1>
        </div>
        
        <p className="max-w-2xl text-[13px] leading-[1.6] text-[var(--text2)]">
          The application hit a runtime error. Telemetry captured the stack trace for engineering review.
        </p>

        {/* Error Details Pane */}
        <div className="w-full rounded-[var(--radius-lg)] bg-[var(--bg1)] border border-[var(--border)] relative mt-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg2)] px-4 py-2">
            <div className="flex items-center gap-2 text-[var(--text3)]">
              <Terminal className="h-4 w-4" />
              <span className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.09em]">diagnostics.log</span>
            </div>
            <span className="font-[family-name:var(--mono)] text-[10px] text-[var(--red)]">{error.name || 'unknown'}</span>
          </div>
          <div className="p-6 overflow-auto">
            <pre className="font-[family-name:var(--mono)] text-[13px] text-[var(--text)] whitespace-pre-wrap break-words leading-[1.7]">
              <span className="text-[var(--red)]">Exception: </span>
              {error.message}
            </pre>
            {error.stack && (
              <pre className="mt-6 font-[family-name:var(--mono)] text-[12px] text-[var(--text3)] whitespace-pre-wrap break-words border-t border-[var(--border)] pt-4 leading-[1.7]">
                {error.stack}
              </pre>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 mt-8 w-full border-t border-[var(--border)] pt-8">
          <button
            type="button" 
            onClick={resetErrorBoundary} 
            className="flex items-center gap-2 rounded-[var(--radius)] bg-[var(--brand)] px-4 h-9 text-[13px] font-medium text-[var(--bg)] shadow-xs transition-opacity hover:opacity-90 cursor-pointer"
          >
            <RefreshCcw className="h-4 w-4" />
            Try again (Reload component)
          </button>

          <button
            type="button" 
            onClick={() => window.location.reload()} 
            className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border2)] bg-[var(--bg1)] px-4 h-9 text-[13px] font-medium text-[var(--text2)] transition-colors hover:border-[var(--text3)] hover:text-[var(--text)] cursor-pointer"
          >
            <RefreshCcw className="h-4 w-4 text-[var(--text3)]" />
            Reload full page
          </button>

          <button
            type="button" 
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border2)] bg-transparent px-4 h-9 text-[13px] font-medium text-[var(--text2)] transition-colors hover:border-[var(--text3)] hover:text-[var(--text)] cursor-pointer"
          >
            <Home className="h-4 w-4" />
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={AppErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  
  // 404 → show animated 404 page, not the scary error diagnostic
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }

  let name = 'UNKNOWN_ERROR';
  let message = 'An unexpected error occurred.';
  let stack = '';

  if (isRouteErrorResponse(error)) {
    name = `HTTP ${error.status} ${error.statusText}`;
    message = error.data || 'A server error occurred.';
  } else if (error instanceof Error) {
    name = error.name;
    message = error.message;
    stack = error.stack || '';
  }

  return (
    <AppErrorFallback 
      error={{ name, message, stack }} 
      resetErrorBoundary={() => window.location.reload()} 
    />
  );
}

