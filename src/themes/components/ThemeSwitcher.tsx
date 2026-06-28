import { useEffect, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useTheme } from '../useTheme';
import type { ThemeId } from '../types';
import { ThemeMenu } from './ThemeMenu';
import { ThemePreview } from './ThemePreview';

interface ThemeSwitcherProps {
  /** Controlled open state */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Optional trigger element rendered inside a DialogTrigger */
  trigger?: ReactNode;
  /** Register the global Ctrl/Cmd+Shift+T / +L shortcuts (default true) */
  enableShortcuts?: boolean;
}

/**
 * Theme switcher modal. Shows the theme menu alongside a live preview that
 * tracks the hovered/focused theme. Registers the keyboard shortcuts:
 *   - Ctrl/Cmd + Shift + T → open switcher
 *   - Ctrl/Cmd + Shift + L → quick toggle dark/light
 */
export function ThemeSwitcher({
  open,
  onOpenChange,
  trigger,
  enableShortcuts = true,
}: ThemeSwitcherProps) {
  const { theme, toggleTheme } = useTheme();

  // Uncontrolled fallback.
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  // Which theme the preview pane should show (hovered theme, else active).
  const [previewId, setPreviewId] = useState<ThemeId | null>(null);
  const effectivePreview = previewId ?? theme;

  // Global keyboard shortcuts. Registering a keydown listener in an effect is
  // the correct pattern (it is event wiring, not data fetching).
  useEffect(() => {
    if (!enableShortcuts) return;
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || !e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key === 't') {
        e.preventDefault();
        setOpen(true);
      } else if (key === 'l') {
        e.preventDefault();
        toggleTheme();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // setOpen is stable enough via closures; toggleTheme is a stable store action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableShortcuts, toggleTheme]);

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent
        showCloseButton
        className="max-w-[calc(100%-2rem)] gap-0 p-0 sm:max-w-3xl"
        onMouseLeave={() => setPreviewId(null)}
      >
        <DialogHeader className="border-b border-[var(--pulse-border-subtle)] p-4">
          <DialogTitle>Theme</DialogTitle>
          <DialogDescription>
            Choose a color theme. Press{' '}
            <kbd className="rounded bg-[var(--pulse-bg-active)] px-1.5 py-0.5 font-mono text-[11px]">
              Ctrl/⌘ + Shift + T
            </kbd>{' '}
            to open this anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-0 md:grid-cols-[minmax(0,300px)_1fr]">
          <div className="border-b border-[var(--pulse-border-subtle)] p-3 md:border-b-0 md:border-r">
            <ThemeMenu onSelected={() => setOpen(false)} onPreview={setPreviewId} />
          </div>
          <div className="p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--pulse-text-muted)]">
              Live preview
            </p>
            <ThemePreview themeId={effectivePreview} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ThemeSwitcher;
