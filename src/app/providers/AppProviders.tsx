import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          expand
          toastOptions={{
            classNames: {
              toast: 'group rounded-lg border border-border bg-popover text-popover-foreground shadow-lg',
              title: 'text-sm font-medium text-foreground',
              description: 'text-sm text-muted-foreground',
              actionButton: 'bg-primary text-primary-foreground',
              cancelButton: 'bg-muted text-muted-foreground',
              success: 'border-[var(--green)]/30 bg-[var(--green-bg)] text-foreground',
              error: 'border-[var(--red)]/30 bg-[var(--red-bg)] text-foreground',
              warning: 'border-[var(--amber)]/30 bg-[var(--amber-bg)] text-foreground',
              info: 'border-[var(--blue)]/30 bg-[var(--blue-bg)] text-foreground',
            },
          }}
        />
      </QueryProvider>
    </ThemeProvider>
  );
}
