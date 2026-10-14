/**
 * Help primitives for the remote config editor: the section intro, the field
 * tooltip, the quiet micro-copy line, and the section glyphs used by the nav.
 *
 * Cyan is reserved for model output, so help text stays neutral. Only real
 * cautions (`type="warning"` / `type="danger"`) take a state colour.
 */
import { useId, useState, type ReactNode } from 'react';
import { AlertTriangle, ChevronDown, Info } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Notice } from '@/shared/ui/pulse';
import { cn } from '@/lib/utils';

// ── Section intro ────────────────────────────────────────────

const DISCLOSURE_BUTTON =
  'inline-flex w-fit items-center gap-1 rounded-[2px] text-[12px] font-medium text-[var(--text)] underline decoration-[var(--border2)] underline-offset-[3px] transition-[text-decoration-color] duration-150 hover:decoration-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]';

/** "Learn more" disclosure for the longer definition behind a section intro. */
function DefinitionDisclosure({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={DISCLOSURE_BUTTON}
      >
        Learn more
        <ChevronDown
          aria-hidden="true"
          className={cn('size-3.5 shrink-0 transition-transform duration-150', open && 'rotate-180')}
        />
      </button>
      <p
        id={panelId}
        hidden={!open}
        className={cn('max-w-[72ch] text-[13px] leading-[1.6] text-[var(--text2)]', className)}
      >
        {text}
      </p>
    </div>
  );
}

/**
 * The intro at the top of an editor section: a 15px heading, one line of
 * purpose, and the optional definition behind "Learn more". Warnings and
 * dangers are real cautions, so they render as a toned Notice instead.
 */
export function SectionBanner({
  title,
  children,
  type = 'info',
  definition,
}: {
  title?: string;
  children: ReactNode;
  type?: 'info' | 'warning' | 'danger';
  definition?: string;
}) {
  if (type === 'warning' || type === 'danger') {
    return (
      <Notice tone={type === 'danger' ? 'red' : 'amber'} icon={AlertTriangle} title={title}>
        {children}
        {definition && (
          <div className="mt-2">
            <DefinitionDisclosure text={definition} className="text-[12px]" />
          </div>
        )}
      </Notice>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {title && (
        <h2 className="text-[15px] font-semibold leading-[1.3] tracking-[-0.015em] text-[var(--text)]">
          {title}
        </h2>
      )}
      <p className="max-w-[72ch] text-[13px] leading-[1.6] text-[var(--text2)]">{children}</p>
      {definition && (
        <div className="mt-1">
          <DefinitionDisclosure text={definition} />
        </div>
      )}
    </div>
  );
}

// ── Field tooltip ────────────────────────────────────────────

/**
 * Info button beside a field label. The content is portalled, so it escapes
 * panels that clip their overflow.
 */
export function FieldTooltip({
  definition,
  whyItMatters,
  recommendation,
  label,
}: {
  definition: string;
  whyItMatters?: string;
  recommendation?: string;
  /** Names the field in the trigger's accessible name ("About {label}"). */
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label ? `About ${label}` : 'More information'}
          // Radix closes a tooltip on press. Keep it open instead, so a tap
          // shows the definition on touch screens, where there is no hover.
          onPointerDown={(event) => {
            if (open) event.preventDefault();
          }}
          onClick={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] text-[var(--text3)] transition-colors duration-150 hover:text-[var(--text)] focus-visible:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]"
        >
          <Info className="size-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="max-w-[280px] flex-col items-start gap-1.5 px-3 py-2.5 text-left font-normal leading-[1.5]"
      >
        <p className="text-[12px] text-[var(--text)]">{definition}</p>
        {whyItMatters && (
          <p className="text-[12px] text-[var(--text2)]">
            <span className="font-medium text-[var(--text)]">Why it matters:</span> {whyItMatters}
          </p>
        )}
        {recommendation && (
          <p className="font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]">{recommendation}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Micro copy ───────────────────────────────────────────────

export function MicroCopy({ children, active }: { children: ReactNode; active?: boolean }) {
  return (
    <p className={cn('mt-1 text-[12px] leading-[1.5]', active ? 'text-[var(--text2)]' : 'text-[var(--text3)]')}>
      {children}
    </p>
  );
}

// ── Section glyphs ───────────────────────────────────────────
// Strokes inherit currentColor, so the nav decides the colour (state or not).

const SECTION_GLYPHS: Record<string, ReactNode> = {
  features: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M13 7l-4 6h5l-2 5" />
    </>
  ),
  transport: (
    <>
      <path d="M2 12h20" />
      <path d="M18 8l4 4-4 4" />
      <path d="M6 8v8" />
      <path d="M10 8v8" />
    </>
  ),
  sampling: (
    <>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      <circle cx="12" cy="7" r="1" fill="currentColor" />
      <circle cx="9" cy="5" r="1" fill="currentColor" />
      <circle cx="15" cy="5" r="1" fill="currentColor" />
    </>
  ),
  privacy: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  instrumentation: (
    <>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  limits: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  killswitches: (
    <>
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </>
  ),
};

/** Decorative section glyph. Unknown names render nothing. */
export function AbstractIcon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const glyph = SECTION_GLYPHS[name];
  if (!glyph) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
    >
      {glyph}
    </svg>
  );
}
