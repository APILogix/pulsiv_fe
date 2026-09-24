import { formatBytes, formatLatency } from "@/shared/observe";
import type { RequestSummaryCards } from "./types";
import { displayValue } from "./helpers";

export function SummaryCards({ cards }: { cards: RequestSummaryCards }) {
  const items = [
    {
      label: "Duration",
      value: cards.duration == null ? "—" : formatLatency(cards.duration),
    },
    {
      label: "Status code",
      value: displayValue(cards.status),
    },
    {
      label: "Request size",
      value: cards.requestSize == null ? "—" : formatBytes(cards.requestSize),
    },
    {
      label: "Response size",
      value: cards.responseSize == null ? "—" : formatBytes(cards.responseSize),
    },
    {
      label: "Span count",
      value: cards.spanCount == null ? "—" : String(cards.spanCount),
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
          <div className="mt-2 font-[family-name:var(--mono)] text-[20px] font-medium leading-none tracking-[-0.02em] tabular-nums text-[var(--text)]">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
