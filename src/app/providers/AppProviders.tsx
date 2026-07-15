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
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: 'group flex items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] px-4 py-3 shadow-md text-[13px] font-medium text-[var(--text)]',
              title: 'text-[13px] font-medium tracking-tight text-[var(--text)]',
              description: 'text-[12px] text-[var(--text2)] mt-0.5',
              actionButton: 'bg-[var(--brand)] text-white rounded-[6px] px-3 py-1.5 text-[12px]',
              cancelButton: 'bg-[var(--bg2)] text-[var(--text2)] rounded-[6px] px-3 py-1.5 text-[12px]',
              success: 'border-[var(--border)] bg-[var(--bg1)] text-[var(--text)]',
              error: 'border-[var(--red)]/30 bg-[var(--red)]/5 text-[var(--red)]',
              warning: 'border-[var(--amber)]/30 bg-[var(--amber)]/5 text-[var(--amber)]',
              info: 'border-[var(--blue)]/30 bg-[var(--blue)]/5 text-[var(--blue)]',
            },
          }}
        />
      </QueryProvider>
    </ThemeProvider>
  );
}
