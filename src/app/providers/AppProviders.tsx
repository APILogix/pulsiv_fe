import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MotionProvider } from '@/shared/motion';

/**
 * Provider order matters for render cost:
 *   ThemeProvider  — writes CSS variables on <html>, must be outermost.
 *   MotionProvider — one MotionConfig for the whole tree + the resolved
 *                    prefers-reduced-motion value. Cheap context, near-static
 *                    value, so it sits high without causing cascade renders.
 *   QueryProvider  — server state.
 *   TooltipProvider— Radix, needs to wrap anything with a tooltip.
 *
 * The Toaster is intentionally a sibling of `children`, not a wrapper: toasts
 * must not re-render the app tree when they mount.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <MotionProvider>
        <QueryProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <Toaster />
        </QueryProvider>
      </MotionProvider>
    </ThemeProvider>
  );
}
