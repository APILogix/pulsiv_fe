import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/shared/observe";
import { toCopyableJson } from "./helpers";

const PREVIEW_CHARS = 12_000;

function JsonNode({
  name,
  value,
  depth,
  query,
  defaultOpen,
}: {
  name?: string;
  value: unknown;
  depth: number;
  query: string;
  defaultOpen: boolean;
}) {
  const isObject = value !== null && typeof value === "object";
  const entries = isObject
    ? Array.isArray(value)
      ? value.map((item, index) => [String(index), item] as const)
      : Object.entries(value as Record<string, unknown>)
    : [];
  const [open, setOpen] = useState(defaultOpen && depth < 2);
  const matchesQuery =
    !query
    || (name?.toLowerCase().includes(query.toLowerCase()) ?? false)
    || (!isObject && String(value).toLowerCase().includes(query.toLowerCase()));

  if (query && !matchesQuery && isObject) {
    const childHits = entries.some(([childName, childValue]) =>
      childName.toLowerCase().includes(query.toLowerCase())
      || JSON.stringify(childValue).toLowerCase().includes(query.toLowerCase()),
    );
    if (!childHits) return null;
  } else if (query && !matchesQuery && !isObject) {
    return null;
  }

  if (!isObject) {
    const rendered = formatPrimitive(value);
    return (
      <div className="flex items-start gap-2 py-0.5 font-[family-name:var(--mono)] text-[12px] leading-relaxed">
        {name !== undefined && (
          <span className="shrink-0 text-[var(--blue)]">{name}</span>
        )}
        {name !== undefined && <span className="text-[var(--text3)]">:</span>}
        <span className={cn("break-all", primitiveTone(value))}>{rendered}</span>
        <CopyButton value={String(value)} label="" className="ml-auto h-6 border-0 px-1 opacity-0 group-hover/row:opacity-100" />
      </div>
    );
  }

  const label = Array.isArray(value) ? `Array(${entries.length})` : `Object(${entries.length})`;

  return (
    <div className="group/row">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-1.5 rounded-[var(--radius)] py-0.5 text-left font-[family-name:var(--mono)] text-[12px] text-[var(--text2)] hover:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      >
        {open ? <ChevronDown className="size-3.5 shrink-0 text-[var(--text3)]" /> : <ChevronRight className="size-3.5 shrink-0 text-[var(--text3)]" />}
        {name !== undefined && <span className="text-[var(--blue)]">{name}</span>}
        {name !== undefined && <span className="text-[var(--text3)]">:</span>}
        <span className="text-[var(--text3)]">{open ? "" : label}</span>
        {!open && <span className="truncate text-[var(--text3)]">{summarize(value)}</span>}
      </button>
      {open && (
        <div className="ml-3 border-l border-[var(--border)] pl-3">
          {entries.length === 0 ? (
            <div className="py-0.5 font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">{Array.isArray(value) ? "[]" : "{}"}</div>
          ) : (
            entries.map(([childName, childValue]) => (
              <JsonNode
                key={childName}
                name={childName}
                value={childValue}
                depth={depth + 1}
                query={query}
                defaultOpen={depth < 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function formatPrimitive(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (value === null) return "null";
  if (typeof value === "undefined") return "undefined";
  return String(value);
}

function primitiveTone(value: unknown): string {
  if (typeof value === "string") return "text-[var(--green)]";
  if (typeof value === "number") return "text-[var(--amber)]";
  if (typeof value === "boolean") return "text-[var(--violet)]";
  if (value === null) return "text-[var(--text3)]";
  return "text-[var(--text)]";
}

function summarize(value: unknown): string {
  try {
    const raw = JSON.stringify(value);
    return raw.length > 80 ? `${raw.slice(0, 80)}…` : raw;
  } catch {
    return "";
  }
}

export function InteractiveJsonViewer({
  data,
  title,
  defaultExpanded = false,
  maxHeight = 420,
}: {
  data: unknown;
  title?: string;
  defaultExpanded?: boolean;
  maxHeight?: number;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(defaultExpanded);
  const json = useMemo(() => toCopyableJson(data), [data]);
  const isLarge = json.length > PREVIEW_CHARS;

  let body: ReactNode;
  if (!expanded && isLarge) {
    body = (
      <div className="flex flex-col gap-3 p-4">
        <pre className="overflow-hidden font-[family-name:var(--mono)] text-[11px] leading-relaxed text-[var(--text3)]">
          {json.slice(0, PREVIEW_CHARS)}…
        </pre>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="self-start rounded-[var(--radius)] border border-[var(--border2)] px-3 py-1.5 text-[12px] text-[var(--text2)] transition-colors hover:border-[var(--text3)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
        >
          Expand full payload ({Math.round(json.length / 1024)} KB)
        </button>
      </div>
    );
  } else {
    body = (
      <div className="sidebar-scroll overflow-auto p-4" style={{ maxHeight }}>
        <JsonNode value={data} depth={0} query={query} defaultOpen />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        {title && <span className="text-[12px] font-medium text-[var(--text2)]">{title}</span>}
        <div className="relative min-w-[160px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text3)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search JSON…"
            aria-label={title ? `Search ${title}` : "Search JSON"}
            className="h-8 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg1)] pl-8 pr-3 text-[12px] text-[var(--text)] outline-none focus:border-[var(--brand)]"
          />
        </div>
        <CopyButton value={json} label="Copy" />
      </div>
      {body}
    </div>
  );
}
