import { lazy, Suspense, type ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { MotionPreferenceProvider } from '@/shared/motion/MotionPreferenceContext';

const Toaster = lazy(() => import('@/components/ui/sonner').then((m) => ({ default: m.Toaster })));

/**
 * Provider order matters for render cost:
 *   ThemeProvider            — writes CSS variables on <html>, must be outermost.
 *   MotionPreferenceProvider — motion preference context without heavy framer-motion runtime.
 *   QueryProvider            — server state.
 *
 * The Toaster is intentionally a sibling of `children`, not a wrapper: toasts
 * must not re-render the app tree when they mount.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <MotionPreferenceProvider>{children}</MotionPreferenceProvider>
        <Suspense fallback={null}>
          <Toaster />
        </Suspense>
      </QueryProvider>
    </ThemeProvider>
  );
}
