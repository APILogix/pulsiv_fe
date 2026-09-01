import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import { hasValue } from "./detail-contract";

function describeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return `List (${value.length})`;
  if (typeof value === "object") return `${Object.keys(value as object).length} field${Object.keys(value as object).length === 1 ? "" : "s"}`;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value);
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

/** Summarized, non-raw view of structured telemetry data. Shows field names
 *  and short descriptions only — never a raw JSON dump of the payload. */
export function StructuredDataSection({ title, data, defaultOpen = false }: { title: string; data: unknown; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!hasValue(data)) return null;

  const entries = data !== null && typeof data === "object" && !Array.isArray(data)
    ? Object.entries(data as Record<string, unknown>)
    : Array.isArray(data)
      ? data.map((item, index) => [`[${index}]`, item] as const)
      : [];

  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]">
        <span className="text-[14px] font-semibold text-[var(--text)]">
          {title}
          <span className="ml-2 font-[family-name:var(--mono)] text-[11px] font-normal text-[var(--text3)]">{entries.length} field{entries.length === 1 ? "" : "s"}</span>
        </span>
        <span className="flex items-center gap-2 text-[11px] text-[var(--text3)]"><span>{open ? "Collapse" : "Expand"}</span><ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} /></span>
      </button>
      {open && entries.length > 0 && (
        <div className="border-t border-[var(--border)] p-5">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {entries.map(([key, value]) => (
              <div key={key} className="min-w-0">
                <dt className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text3)]">{key}</dt>
                <dd className="mt-1.5 truncate text-[13px] text-[var(--text)]" title={describeValue(value)}>{describeValue(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}

export function StructuredDataEmpty({ title }: { title: string }) {
  return <EmptyState title={`No ${title.toLowerCase()} captured`} />;
}
