import { ReadoutBand, formatBytes, formatLatency } from "@/shared/observe";
import type { ReadoutCell } from "@/shared/observe";
import type { RequestSummaryCards } from "./types";

function statusClass(code: number | null) {
  if (code === null) return { sub: "HTTP status", tone: "neutral" as const };
  if (code >= 500) return { sub: "Server error", tone: "bad" as const };
  if (code >= 400) return { sub: "Client error", tone: "warn" as const };
  if (code >= 300) return { sub: "Redirect", tone: "neutral" as const };
  return { sub: "Success", tone: "good" as const };
}

export function SummaryCards({ cards }: { cards: RequestSummaryCards }) {
  const code = typeof cards.status === "number" ? cards.status : null;
  const status = statusClass(code);
  const slow = cards.duration != null && cards.duration >= 1000;

  const cells: ReadoutCell[] = [
    {
      label: "Duration",
      value: cards.duration == null ? "—" : formatLatency(cards.duration),
      sub: slow ? "slower than 1 s" : "end-to-end",
      tone: slow ? "bad" : cards.duration != null && cards.duration >= 500 ? "warn" : "neutral",
    },
    { label: "Status", value: cards.status == null ? "—" : String(cards.status), sub: status.sub, tone: status.tone },
    { label: "Request size", value: cards.requestSize == null ? "—" : formatBytes(cards.requestSize), sub: "inbound body" },
    { label: "Response size", value: cards.responseSize == null ? "—" : formatBytes(cards.responseSize), sub: "outbound body" },
    { label: "Spans", value: cards.spanCount == null ? "—" : String(cards.spanCount), sub: "in the correlated trace" },
  ];

  return <ReadoutBand cells={cells} />;
}
