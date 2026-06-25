import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { useRouteError, isRouteErrorResponse } from 'react-router';
import { AlertTriangle, Terminal, RefreshCcw, Home } from 'lucide-react';
import NotFoundPage from '@/shared/components/NotFoundPage';

function AppErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen w-full bg-[var(--bg)] flex flex-col items-start justify-start p-8 relative overflow-hidden font-[family-name:var(--sans)] text-[var(--text)] selection:bg-[var(--red)] selection:text-white">
      {/* Top red bar indicating system panic */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[var(--red)]" />
      
      <div className="w-full max-w-5xl flex flex-col items-start gap-6 border-l border-[var(--border)] pl-8 py-8 mt-12 relative">
        {/* Decorative corner indicator */}
        <div className="absolute top-0 -left-[5px] w-2 h-2 bg-[var(--red)]" />

        <div className="flex items-center gap-3 text-[var(--red)]">
          <AlertTriangle className="h-6 w-6 stroke-[1.5]" />
          <h1 className="text-xl font-bold tracking-widest uppercase font-[family-name:var(--mono)]">
            System_Panic // Critical_Exception
          </h1>
        </div>
        
        <p className="text-[var(--text2)] text-base max-w-2xl leading-relaxed">
          The application encountered a critical runtime error. Telemetry has automatically captured the stack trace for engineering review. Halting execution to prevent data corruption.
        </p>

        {/* Error Details Pane */}
        <div className="w-full bg-[var(--bg1)] border border-[var(--border)] relative mt-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg2)] px-4 py-2">
            <div className="flex items-center gap-2 text-[var(--text2)]">
              <Terminal className="h-4 w-4" />
              <span className="font-[family-name:var(--mono)] text-xs tracking-wider uppercase">Diagnostics.log</span>
            </div>
            <span className="font-[family-name:var(--mono)] text-[10px] text-[var(--red)] font-bold">ERR_NAME: {error.name || 'UNKNOWN'}</span>
          </div>
          <div className="p-6 overflow-auto">
            <pre className="font-[family-name:var(--mono)] text-sm text-[var(--text)] whitespace-pre-wrap break-words leading-relaxed">
              <span className="text-[var(--red)] font-bold">Exception: </span>
              {error.message}
            </pre>
            {error.stack && (
              <pre className="mt-6 font-[family-name:var(--mono)] text-xs text-[var(--text3)] whitespace-pre-wrap break-words border-t border-[var(--border)] pt-4">
                {error.stack}
              </pre>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-8 w-full border-t border-[var(--border)] pt-8">
          <button 
            onClick={resetErrorBoundary} 
            className="flex items-center gap-2 px-6 py-3 bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)] hover:bg-[var(--red)] hover:text-white transition-colors font-[family-name:var(--mono)] text-sm uppercase tracking-wider font-semibold cursor-pointer"
          >
            <RefreshCcw className="h-4 w-4" />
            Reload_System
          </button>
          <button 
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 px-6 py-3 bg-transparent text-[var(--text2)] border border-[var(--border)] hover:bg-[var(--bg2)] hover:text-[var(--text)] transition-colors font-[family-name:var(--mono)] text-sm uppercase tracking-wider font-semibold cursor-pointer"
          >
            <Home className="h-4 w-4" />
            Return_to_Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary 
      FallbackComponent={AppErrorFallback}
      onReset={() => {
        window.location.reload();
      }}
    >
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
      resetErrorBoundary={() => window.location.href = '/'} 
    />
  );
}
