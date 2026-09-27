import { CopyButton, Timestamp } from "@/shared/observe";
import { Globe, Database, MousePointer, Terminal, AlertTriangle, Layers, Zap } from "lucide-react";
import type { Breadcrumb } from "./types";

const CATEGORY_ICONS: Record<string, typeof Globe> = {
  http: Globe,
  fetch: Globe,
  xhr: Globe,
  db: Database,
  database: Database,
  query: Database,
  ui: MousePointer,
  click: MousePointer,
  user: MousePointer,
  log: Terminal,
  console: Terminal,
  error: AlertTriangle,
  navigation: Layers,
};

const LEVEL_TONES: Record<string, string> = {
  error: "text-[var(--red)] bg-[var(--red-bg)] border-[var(--red)]/20",
  fatal: "text-[var(--red)] bg-[var(--red-bg)] border-[var(--red)]/20",
  warning: "text-[var(--amber)] bg-[var(--amber-bg)] border-[var(--amber)]/20",
  warn: "text-[var(--amber)] bg-[var(--amber-bg)] border-[var(--amber)]/20",
  info: "text-[var(--blue)] bg-[var(--blue-bg)] border-[var(--blue)]/20",
  debug: "text-[var(--text2)] bg-[var(--bg2)] border-[var(--border)]",
};

export function BreadcrumbsTimeline({ breadcrumbs }: { breadcrumbs: Breadcrumb[] }) {
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[13px] text-[var(--text3)]">
        No breadcrumbs recorded before this error.
      </div>
    );
  }

  return (
    <div className="relative border-l border-[var(--border)] ml-3 pl-7 space-y-4 py-1">
      {breadcrumbs.map((item, index) => {
        const cat = (item.category ?? item.type ?? "log").toLowerCase();
        const Icon = CATEGORY_ICONS[cat] ?? Terminal;
        const level = (item.level ?? "info").toLowerCase();
        const tone = LEVEL_TONES[level] ?? LEVEL_TONES.info;
        const msg = item.message ?? item.category ?? "Breadcrumb event";
        const timeVal = item.timestamp ?? item.occurredAt;

        return (
          <div key={index} className="relative group">
            {/* Timeline node icon dot */}
            <div className="absolute -left-[41px] top-1.5 flex size-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg1)] text-[var(--text3)] group-hover:border-[var(--brand)] group-hover:text-[var(--brand)] transition-colors shadow-xs">
              <Icon className="size-3.5" />
            </div>

            {/* Breadcrumb row card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 transition-all hover:border-[var(--border2)] hover:bg-[var(--bg1)]/80 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-[family-name:var(--mono)] text-[9.5px] font-semibold uppercase tracking-[0.08em] ${tone}`}>
                    {level}
                  </span>
                  <span className="font-[family-name:var(--mono)] text-[10.5px] uppercase font-semibold tracking-[0.08em] text-[var(--text3)]">
                    {cat}
                  </span>
                  <span className="font-[family-name:var(--mono)] text-[13px] font-medium text-[var(--text)] break-all">
                    {msg}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                  {timeVal && <Timestamp value={timeVal} />}
                  <CopyButton value={msg} label="" className="h-6 w-6 border-0 p-0 text-[var(--text3)] hover:text-[var(--text)]" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
