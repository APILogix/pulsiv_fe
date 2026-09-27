import { Clock, Globe, ArrowDownRight, ArrowUpRight, Layers } from "lucide-react";
import { formatBytes, formatLatency } from "@/shared/observe";
import type { RequestSummaryCards } from "./types";
import { displayValue } from "./helpers";

export function SummaryCards({ cards }: { cards: RequestSummaryCards }) {
  const statusNum = typeof cards.status === "number" ? cards.status : null;
  const isSuccess = statusNum !== null && statusNum >= 200 && statusNum < 300;
  const isRedirect = statusNum !== null && statusNum >= 300 && statusNum < 400;
  const isClientError = statusNum !== null && statusNum >= 400 && statusNum < 500;
  const isServerError = statusNum !== null && statusNum >= 500;

  const items = [
    {
      label: "Duration",
      value: cards.duration == null ? "—" : formatLatency(cards.duration),
      icon: Clock,
      subtext: cards.duration != null && cards.duration > 1000 ? "High latency" : "Total roundtrip",
      accent: cards.duration != null && cards.duration > 1000 ? "text-[var(--amber)]" : "text-[var(--text2)]",
    },
    {
      label: "Status Code",
      value: displayValue(cards.status),
      icon: Globe,
      subtext: isSuccess
        ? "2xx Success"
        : isRedirect
        ? "3xx Redirect"
        : isClientError
        ? "4xx Client Error"
        : isServerError
        ? "5xx Server Error"
        : "HTTP Status",
      accent: isSuccess
        ? "text-[var(--green)]"
        : isServerError
        ? "text-[var(--red)]"
        : isClientError
        ? "text-[var(--amber)]"
        : "text-[var(--text2)]",
    },
    {
      label: "Request Size",
      value: cards.requestSize == null ? "—" : formatBytes(cards.requestSize),
      icon: ArrowUpRight,
      subtext: "Inbound payload",
      accent: "text-[var(--blue)]",
    },
    {
      label: "Response Size",
      value: cards.responseSize == null ? "—" : formatBytes(cards.responseSize),
      icon: ArrowDownRight,
      subtext: "Outbound transfer",
      accent: "text-[var(--violet)]",
    },
    {
      label: "Correlated Spans",
      value: cards.spanCount == null ? "—" : String(cards.spanCount),
      icon: Layers,
      subtext: "Execution steps",
      accent: "text-[var(--brand)]",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="group relative flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-xs transition-all hover:border-[var(--border2)] hover:bg-[var(--bg1)]/80"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text3)]">
                {item.label}
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--bg2)] text-[var(--text3)] group-hover:text-[var(--text)] transition-colors">
                <Icon className="size-3.5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-[family-name:var(--mono)] text-[22px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[var(--text)]">
                {item.value}
              </div>
              <p className={`mt-2 text-[11.5px] font-medium leading-none ${item.accent}`}>
                {item.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
