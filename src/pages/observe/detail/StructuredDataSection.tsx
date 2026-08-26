import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/shared/observe";
import { EmptyState } from "./EmptyState";
import { hasValue } from "./detail-contract";

function replacer(_key: string, value: unknown) {
  if (value instanceof Set) return Array.from(value);
  return value;
}

function highlightJson(json: string, query: string): React.ReactNode {
  if (!query) return json;
  const parts = json.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")})`, "gi"));
  return parts.map((part, index) => part.toLowerCase() === query.toLowerCase() ? <mark key={index} className="rounded bg-[var(--amber-bg)] text-[var(--amber)]">{part}</mark> : part);
}

export function StructuredDataSection({ title, data, defaultOpen = false }: { title: string; data: unknown; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const json = useMemo(() => JSON.stringify(data, replacer, 2), [data]);
  if (!hasValue(data)) return null;

  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]">
        <span className="text-[14px] font-semibold text-[var(--text)]">{title}</span>
        <span className="flex items-center gap-2 text-[11px] text-[var(--text3)]"><span>{open ? "Collapse" : "Expand"}</span><ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} /></span>
      </button>
      {open && (
        <div className="border-t border-[var(--border)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-[var(--text3)]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}…`} className="h-8 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] pl-8 pr-3 text-[12px] text-[var(--text)] outline-none focus:border-[var(--brand)]" />
            </div>
            <CopyButton value={json} label="Copy JSON" />
          </div>
          <pre className="sidebar-scroll max-h-[420px] overflow-auto rounded-[var(--radius)] bg-[var(--bg)] p-4 font-[family-name:var(--mono)] text-[11px] leading-relaxed text-[var(--text2)]"><code>{highlightJson(json, query)}</code></pre>
        </div>
      )}
    </section>
  );
}

export function StructuredDataEmpty({ title }: { title: string }) {
  return <EmptyState title={`No ${title.toLowerCase()} captured`} />;
}
