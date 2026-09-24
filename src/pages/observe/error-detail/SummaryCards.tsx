import type { ErrorDetailResponse } from "./types";
import { displayValue } from "./helpers";

export function SummaryCards({ detail }: { detail: ErrorDetailResponse }) {
  const issueId = detail.errorGroup?.publicId ?? detail.related?.errorGroup?.publicId;
  const traceId = detail.trace?.publicId ?? detail.related?.trace?.publicId;

  const items = [
    {
      label: "Exception Class",
      value: detail.error?.name ?? "Error",
      mono: true,
      highlight: true,
    },
    {
      label: "Handled Status",
      value: detail.error?.handled == null ? "—" : detail.error.handled ? "Handled" : "Unhandled",
      tone: detail.error?.handled === false ? "text-[var(--red)]" : "text-[var(--green)]",
    },
    {
      label: "Severity",
      value: (detail.error?.severity ?? "error").toUpperCase(),
      mono: true,
    },
    {
      label: "Issue Group",
      value: displayValue(issueId),
      mono: true,
    },
    {
      label: "Trace Link",
      value: displayValue(traceId),
      mono: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] px-5 py-4"
        >
          <div className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text3)]">
            {item.label}
          </div>
          <div
            className={`mt-2 truncate font-[family-name:var(--mono)] text-[18px] font-medium leading-none tracking-[-0.02em] tabular-nums ${
              item.tone ? item.tone : item.highlight ? "text-[var(--red)]" : "text-[var(--text)]"
            }`}
            title={item.value}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
