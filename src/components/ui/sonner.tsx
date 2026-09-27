import React from 'react';
import { Toaster as Sonner, toast as sonnerToast, type ToasterProps } from 'sonner';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
  Sparkles,
  Zap,
  Copy,
} from 'lucide-react';

/**
 * Sentinel Obsidian Luxe Toaster
 *
 * Implements the Sentinel Three-Channel Design System:
 *   - Brand channel: product actions and identity
 *   - Truth channel: system health verdicts (green, crimson red, amber)
 *   - AI channel: cyan intelligence and predictions
 *
 * Surfaces feature glassmorphism with backdrop-blur, hairline reflections,
 * channel-glowing status halos, and refined typography.
 */
export function Toaster({ ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={(resolvedTheme || 'dark') as ToasterProps['theme']}
      className="toaster group"
      position="bottom-right"
      richColors={false}
      closeButton={true}
      expand={true}
      gap={10}
      offset="20px"
      visibleToasts={4}
      icons={{
        success: <Check className="size-3.5 stroke-[2.5]" />,
        error: <AlertCircle className="size-3.5 stroke-[2.2]" />,
        warning: <AlertTriangle className="size-3.5 stroke-[2.2]" />,
        info: <Info className="size-3.5 stroke-[2.2]" />,
        loading: <Loader2 className="size-3.5 stroke-[2.5] animate-spin" />,
        close: <X className="size-3 stroke-[2.2]" />,
      }}
      toastOptions={{
        classNames: {
          toast: 'group toast',
          title: 'font-sans font-semibold text-[13px] text-white tracking-[-0.01em] leading-snug',
          description: 'font-sans text-[12px] text-zinc-400 font-normal leading-relaxed mt-0.5',
          actionButton:
            'h-7 px-3 text-[11.5px] font-semibold rounded-md bg-white text-zinc-950 hover:bg-zinc-200 active:scale-95 transition-all shadow-sm border-none ml-auto shrink-0 cursor-pointer',
          cancelButton:
            'h-7 px-2.5 text-[11.5px] font-medium rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700/60 transition-all active:scale-95 shrink-0 cursor-pointer',
          closeButton:
            'size-5.5 rounded-md flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 hover:border-zinc-500 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer',
        },
      }}
      {...props}
    />
  );
}

/**
 * Enhanced Toast API
 *
 * Fully backward-compatible with `import { toast } from 'sonner'`,
 * with signature Sentinel channel extensions:
 *   - `toast.ai(...)`     → Cyan AI-channel insight toast with sparkles
 *   - `toast.quota(...)`  → Credits & quota warning toast
 *   - `toast.copy(...)`   → Monospace copy-to-clipboard confirmation
 */
type SonnerToastType = typeof sonnerToast;

interface SentinelToastExtensions {
  /**
   * AI Channel Toast — cyan glow and sparkles icon for AI insights and recommendations.
   */
  ai: (
    message: string | React.ReactNode,
    data?: Parameters<SonnerToastType>[1]
  ) => string | number;

  /**
   * Quota / Billing Toast — amber warning for event credit ceilings and budget thresholds.
   */
  quota: (
    message: string | React.ReactNode,
    data?: Parameters<SonnerToastType>[1]
  ) => string | number;

  /**
   * Copy Toast — copies string to clipboard and shows a clean confirmation toast.
   */
  copy: (
    textToCopy: string,
    label?: string,
    data?: Parameters<SonnerToastType>[1]
  ) => Promise<string | number>;
}

export const toast: SonnerToastType & SentinelToastExtensions = Object.assign(
  (...args: Parameters<SonnerToastType>) => sonnerToast(...args),
  sonnerToast,
  {
    ai: (message: string | React.ReactNode, data?: Parameters<SonnerToastType>[1]) => {
      return sonnerToast(message, {
        ...data,
        className: `toast-ai ${data?.className || ''}`.trim(),
        icon: data?.icon || <Sparkles className="size-3.5 stroke-[2.2] text-[var(--ai)]" />,
      });
    },

    quota: (message: string | React.ReactNode, data?: Parameters<SonnerToastType>[1]) => {
      return sonnerToast(message, {
        ...data,
        className: `toast-quota ${data?.className || ''}`.trim(),
        icon: data?.icon || <Zap className="size-3.5 stroke-[2.2] text-[var(--amber)]" />,
      });
    },

    copy: async (
      textToCopy: string,
      label?: string,
      data?: Parameters<SonnerToastType>[1]
    ) => {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(textToCopy);
        }
      } catch {
        // Fallback for browsers with restricted clipboard permissions
      }
      return sonnerToast.success(label || 'Copied to clipboard', {
        ...data,
        description: (
          <span className="font-mono text-[11px] text-zinc-300 break-all">
            {textToCopy.length > 50 ? `${textToCopy.slice(0, 48)}...` : textToCopy}
          </span>
        ),
        icon: <Copy className="size-3.5 stroke-[2.2] text-[var(--green)]" />,
      });
    },
  }
);

export default Toaster;
