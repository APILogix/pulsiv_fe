import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useTheme } from '@/theme/ThemeProvider';

export function Toaster({ ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={(resolvedTheme || 'dark') as ToasterProps['theme']}
      className="toaster group"
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-[var(--bg1)] group-[.toaster]:text-[var(--text)] group-[.toaster]:border-[var(--border)] group-[.toaster]:shadow-[var(--shadow-toast)] group-[.toaster]:rounded-[var(--radius-lg)] group-[.toaster]:text-[13px] group-[.toaster]:font-sans',
          description: 'group-[.toast]:text-[var(--text2)] group-[.toast]:text-[12px]',
          actionButton:
            'group-[.toast]:bg-[var(--brand)] group-[.toast]:text-[var(--brand-fg)] group-[.toast]:rounded-[var(--radius-sm)]',
          cancelButton:
            'group-[.toast]:bg-[var(--bg2)] group-[.toast]:text-[var(--text2)] group-[.toast]:rounded-[var(--radius-sm)]',
          closeButton:
            'group-[.toast]:bg-[var(--bg2)] group-[.toast]:text-[var(--text2)] group-[.toast]:border-[var(--border)] group-[.toast]:hover:bg-[var(--bg3)]',
        },
      }}
      {...props}
    />
  );
}
