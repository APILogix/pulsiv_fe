// Pieces shared by the request, error, and trace detail pages.
import { Link } from "react-router";
import { RefreshCw, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CopyButton, EmptyNote, Timestamp } from "@/shared/observe";
import { aiButtonClass, ghostButtonClass } from "@/shared/observe/form";
import { cn } from "@/lib/utils";

export function toPairs(raw: unknown): Array<{ key: string; value: string }> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, unknown>).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? value : JSON.stringify(value),
  }));
}

/** Label-left key/value table for headers, query strings, and attributes. */
export function PairTable({ title, rows, empty, maxHeight = 288 }: { title: string; rows: { key: string; value: string }[]; empty: string; maxHeight?: number }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-1.5 text-[13px] font-medium text-[var(--text)]">
        {title} <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">{rows.length}</span>
      </h3>
      {rows.length === 0 ? (
        <p className="border-t border-[var(--border)] py-2.5 text-[12px] text-[var(--text3)]">{empty}</p>
      ) : (
        <dl className="sidebar-scroll overflow-y-auto border-t border-[var(--border)]" style={{ maxHeight }}>
          {rows.map((r) => (
            <div key={r.key} className="group grid grid-cols-[minmax(0,200px)_minmax(0,1fr)_20px] items-baseline gap-3 border-b border-[var(--border)] py-2">
              <dt className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]" title={r.key}>{r.key}</dt>
              <dd className="break-all font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{r.value}</dd>
              <CopyButton value={r.value} label="" className="h-5 w-5 justify-center border-0 p-0 text-[var(--text3)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100" />
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Flush panel listing correlated resources, one link per row. */
export function RelatedPanel({ id, title = "Related", description, children }: { id: string; title?: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="min-w-0 scroll-mt-16 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]">
      <div className="border-b border-[var(--border)] px-5 py-3.5">
        <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">{title}</h2>
        {description && <p className="mt-0.5 text-[12px] text-[var(--text3)]">{description}</p>}
      </div>
      <div className="divide-y divide-[var(--border)]">{children}</div>
    </section>
  );
}

export function RelatedRow({ icon: Icon, tone, label, primary, secondary, href }: {
  icon: LucideIcon;
  tone: string;
  label: string;
  primary: string;
  secondary?: string | null;
  href: string | null;
}) {
  const body = (
    <>
      <Icon className={cn("size-3.5 shrink-0", tone)} aria-hidden="true" />
      <span className="w-24 shrink-0 text-[12px] text-[var(--text3)]">{label}</span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate font-[family-name:var(--mono)] text-[12px]", href ? "text-[var(--text)]" : "text-[var(--text2)]")}>{primary}</span>
        {secondary && <span className="block truncate text-[12px] text-[var(--text3)]">{secondary}</span>}
      </span>
    </>
  );
  return href ? (
    <Link to={href} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]">{body}</Link>
  ) : (
    <div className="flex items-center gap-3 px-5 py-2.5">{body}</div>
  );
}

export interface AiParsed {
  summary?: string | null;
  rootCause?: string | null;
  recommendations: string[];
  confidence?: number | null;
  generatedAt?: string | number | null;
}

/** Body of the AI analysis panel: prompt to run, or the model's answer. */
export function AiAnalysisBody({ parsed, analyzing, onAnalyze, subject, reads }: {
  parsed: AiParsed | null;
  analyzing: boolean;
  onAnalyze: () => void;
  subject: string;
  reads: string;
}) {
  if (!parsed) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-[60ch] text-[13px] leading-[1.6] text-[var(--text2)]">No analysis yet. The model reads {reads}, then suggests a likely cause.</p>
        <button type="button" className={aiButtonClass} onClick={onAnalyze} disabled={analyzing}>
          <Sparkles className="size-3.5" aria-hidden="true" />
          {analyzing ? "Analyzing…" : `Analyze ${subject}`}
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {parsed.summary && <p className="max-w-[80ch] text-[14px] leading-[1.65] text-[var(--text)]">{parsed.summary}</p>}
      {parsed.rootCause && (
        <div className="rounded-[var(--radius)] bg-[var(--amber-bg)] px-4 py-3">
          <h3 className="text-[12px] font-medium text-[var(--amber)]">Likely cause</h3>
          <p className="mt-1 text-[13px] leading-[1.6] text-[var(--text)]">{parsed.rootCause}</p>
        </div>
      )}
      {parsed.recommendations.length > 0 && (
        <div>
          <h3 className="text-[13px] font-medium text-[var(--text)]">Recommendations</h3>
          <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-[13px] leading-[1.6] text-[var(--text2)] marker:font-[family-name:var(--mono)] marker:text-[var(--text3)]">
            {parsed.recommendations.map((item) => <li key={item}>{item}</li>)}
          </ol>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4 border-t border-[var(--border)] pt-3 text-[12px] text-[var(--text3)]">
        {parsed.confidence != null && (
          <span>
            Confidence{" "}
            <span className="font-[family-name:var(--mono)] tabular-nums text-[var(--ai)]">
              {Math.round(parsed.confidence <= 1 ? parsed.confidence * 100 : parsed.confidence)}%
            </span>
          </span>
        )}
        {parsed.generatedAt && <span>Generated <Timestamp value={parsed.generatedAt} /></span>}
      </div>
    </div>
  );
}

export function AiRerunButton({ analyzing, onAnalyze }: { analyzing: boolean; onAnalyze: () => void }) {
  return (
    <button type="button" className={ghostButtonClass} onClick={onAnalyze} disabled={analyzing}>
      <RefreshCw className={cn("size-3.5", analyzing && "animate-spin")} aria-hidden="true" />
      {analyzing ? "Analyzing…" : "Run again"}
    </button>
  );
}

export function TagChips({ tags, empty }: { tags: { key: string; label?: string; value: string }[]; empty: string }) {
  if (tags.length === 0) return <EmptyNote>{empty}</EmptyNote>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <button
          key={`${tag.key}:${tag.value}`}
          type="button"
          title={`Copy ${tag.key}:${tag.value}`}
          onClick={() => navigator.clipboard?.writeText(`${tag.key}:${tag.value}`)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[12px] transition-colors hover:border-[var(--border2)] hover:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text3)]"
        >
          <span className="text-[var(--text3)]">{tag.label ?? tag.key}</span>
          <span className="font-[family-name:var(--mono)] text-[var(--text)]">{tag.value}</span>
        </button>
      ))}
    </div>
  );
}
