import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        'relative mb-6 rounded-lg border p-4 text-[14px]',
        type === 'info' && 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100',
        type === 'warning' && 'border-amber-500/30 bg-amber-500/10 text-amber-100',
        type === 'danger' && 'border-red-500/30 bg-red-500/10 text-red-100',
      )}
    >
      <button
        type="button"
        className="absolute right-3 top-3 text-white/50 hover:text-white"
        onClick={() => setDismissed(true)}
      >
        <X className="size-4" />
      </button>
      {title && <h3 className="mb-1 font-semibold">{title}</h3>}
      <p className="pr-6 leading-relaxed">
        {children}
        {definition && (
          <button
            type="button"
            className="ml-2 font-medium underline underline-offset-2 opacity-80 hover:opacity-100"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? 'Show less' : 'Learn more'}
          </button>
        )}
      </p>
      {expanded && definition && (
        <div className="mt-3 rounded-md bg-black/20 p-3 text-[13px] leading-relaxed">
          {definition}
        </div>
      )}
    </div>
  );
}

export function FieldTooltip({
  definition,
  whyItMatters,
  recommendation,
}: {
  definition: string;
  whyItMatters?: string;
  recommendation?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        className="ml-1.5 flex size-4 items-center justify-center rounded-full text-[var(--text3)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        aria-label="More information"
      >
        <Info className="size-3.5" />
      </button>
      
      {isOpen && (
        <div
          ref={tooltipRef}
          className="absolute bottom-full left-1/2 z-[100] mb-2 w-64 -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--bg2)] p-3 text-left shadow-lg"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <p className="text-[12px] font-normal leading-relaxed text-[var(--text)]">
            {definition}
          </p>
          {whyItMatters && (
            <p className="mt-2 text-[12px] font-normal leading-relaxed text-[var(--text2)]">
              <span className="font-medium text-[var(--text)]">Why it matters:</span>{' '}
              {whyItMatters}
            </p>
          )}
          {recommendation && (
            <p className="mt-2 text-[11px] font-mono text-[var(--text3)]">
              {recommendation}
            </p>
          )}
          
          {/* Arrow */}
          <div className="absolute left-1/2 top-full -mt-px h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-[var(--border)] bg-[var(--bg2)]" />
        </div>
      )}
    </div>
  );
}

export function MicroCopy({ children, active }: { children: ReactNode; active?: boolean }) {
  return (
    <p className={cn("mt-1 text-[12px] leading-relaxed", active ? "text-[var(--text2)]" : "text-[var(--text3)]")}>
      {children}
    </p>
  );
}

export function AbstractIcon({ name }: { name: string }) {
  // Map of abstract icons defined in the spec
  const icons: Record<string, ReactNode> = {
    features: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--brand)]">
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M13 7l-4 6h5l-2 5" />
      </svg>
    ),
    transport: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--brand)]">
        <path d="M2 12h20" />
        <path d="M18 8l4 4-4 4" />
        <path d="M6 8v8" />
        <path d="M10 8v8" />
      </svg>
    ),
    sampling: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--brand)]">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        <circle cx="12" cy="7" r="1" fill="currentColor" />
        <circle cx="9" cy="5" r="1" fill="currentColor" />
        <circle cx="15" cy="5" r="1" fill="currentColor" />
      </svg>
    ),
    privacy: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--brand)]">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    instrumentation: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--brand)]">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    limits: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--brand)]">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    killswitches: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
        <line x1="12" y1="2" x2="12" y2="12" />
      </svg>
    ),
  };

  return icons[name] || null;
}
