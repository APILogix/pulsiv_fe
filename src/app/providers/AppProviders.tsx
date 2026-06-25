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
          toastOptions={{
            style: {
              background: 'rgba(17, 17, 17, 0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #262626',
              color: '#e8e8e8',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '14px',
              boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.5)',
            },
            className: 'my-custom-toast',
          }}
        />
      </QueryProvider>
    </ThemeProvider>
  );
}
