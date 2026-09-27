import { useState } from "react";
import { ChevronDown, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import { hasValue } from "./detail-contract";

function describeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return `List (${value.length} items)`;
  if (typeof value === "object") return `${Object.keys(value as object).length} attributes`;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value);
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

/** Summarized, non-raw view of structured telemetry data. Shows field names
 *  and clean descriptions only — never a raw JSON dump. */
export function StructuredDataSection({ title, data, defaultOpen = true }: { title: string; data: unknown; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!hasValue(data)) return null;

  const entries = data !== null && typeof data === "object" && !Array.isArray(data)
    ? Object.entries(data as Record<string, unknown>)
    : Array.isArray(data)
      ? data.map((item, index) => [`[${index}]`, item] as const)
      : [];

  if (entries.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg1)] shadow-xs">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-[var(--bg2)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)] cursor-pointer"
      >
        <span className="flex items-center gap-2.5 text-[14px] font-semibold text-[var(--text)]">
          <Layers className="size-4 text-[var(--brand)]" />
          {title}
          <span className="font-[family-name:var(--mono)] text-[11px] font-normal text-[var(--text3)]">
            ({entries.length} attribute{entries.length === 1 ? "" : "s"})
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--text3)] font-medium">
          <span>{open ? "Collapse" : "Expand"}</span>
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open && entries.length > 0 && (
        <div className="border-t border-[var(--border)] p-6 bg-[var(--bg)]/40">
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map(([key, value]) => (
              <div key={key} className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--bg1)] p-3.5 shadow-xs">
                <dt className="font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text3)] truncate">
                  {key}
                </dt>
                <dd className="mt-1 font-[family-name:var(--mono)] text-[13px] font-medium text-[var(--text)] truncate" title={describeValue(value)}>
                  {describeValue(value)}
                </dd>
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

