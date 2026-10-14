import React from 'react';
import { Toaster as Sonner, toast as sonnerToast, type ToasterProps } from 'sonner';
import {
  CircleCheck,
  CircleAlert,
  TriangleAlert,
  Info,
  LoaderCircle,
  X,
  Sparkles,
  Gauge,
  Copy,
} from 'lucide-react';

/**
 * Sentinel Toaster
 *
 * A status line in the console's own material: `--bg2` sheet, one hairline,
 * the system `--shadow-toast`. State lives in the glyph; only states that
 * need attention (warning, error, AI) tint the hairline. All styling is in
 * `src/styles/toast.css`, scoped under `.pulse-toaster`.
 *
 * Both Sentinel themes are dark, so the sonner theme is pinned to `dark`.
 */
const glyph = 'size-4 stroke-[2]';

export function Toaster({ className, style, ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className={['pulse-toaster', className].filter(Boolean).join(' ')}
      position="bottom-right"
      richColors={false}
      closeButton
      expand
      gap={8}
      offset={20}
      mobileOffset={12}
      visibleToasts={4}
      style={{ '--width': '380px', ...style } as React.CSSProperties}
      icons={{
        success: <CircleCheck className={glyph} aria-hidden />,
        error: <CircleAlert className={glyph} aria-hidden />,
        warning: <TriangleAlert className={glyph} aria-hidden />,
        info: <Info className={glyph} aria-hidden />,
        loading: <LoaderCircle className={`${glyph} animate-spin motion-reduce:animate-none`} aria-hidden />,
        close: <X className="size-3.5 stroke-[2]" aria-hidden />,
      }}
      {...props}
    />
  );
}

/**
 * Enhanced Toast API
 *
 * Fully backward-compatible with `import { toast } from 'sonner'`,
 * with Sentinel channel extensions:
 *   - `toast.ai(...)`     → AI-channel insight (cyan glyph, model output only)
 *   - `toast.quota(...)`  → Credits & quota warning (amber)
 *   - `toast.copy(...)`   → Copy-to-clipboard confirmation with the copied value
 */
type SonnerToastType = typeof sonnerToast;

interface SentinelToastExtensions {
  /** AI Channel Toast — cyan glyph for model insights and recommendations. */
  ai: (
    message: string | React.ReactNode,
    data?: Parameters<SonnerToastType>[1]
  ) => string | number;

  /** Quota / Billing Toast — amber warning for credit ceilings and budget thresholds. */
  quota: (
    message: string | React.ReactNode,
    data?: Parameters<SonnerToastType>[1]
  ) => string | number;

  /** Copy Toast — copies a string to the clipboard and confirms with the value. */
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
        icon: data?.icon || <Sparkles className={glyph} aria-hidden />,
      });
    },

    quota: (message: string | React.ReactNode, data?: Parameters<SonnerToastType>[1]) => {
      return sonnerToast(message, {
        ...data,
        className: `toast-quota ${data?.className || ''}`.trim(),
        icon: data?.icon || <Gauge className={glyph} aria-hidden />,
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
          <code className="break-all">
            {textToCopy.length > 50 ? `${textToCopy.slice(0, 48)}…` : textToCopy}
          </code>
        ),
        icon: <Copy className={glyph} aria-hidden />,
      });
    },
  }
);

export default Toaster;
