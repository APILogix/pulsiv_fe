import { ErrorBoundary } from 'react-error-boundary';

export function ModuleErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={<div>Something went wrong in this module.</div>}>
      {children}
    </ErrorBoundary>
  );
}
