import { CopyButton, Timestamp } from "@/shared/observe";
import { Globe, Database, MousePointer, Terminal, AlertTriangle, Layers } from "lucide-react";
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
  error: "text-[var(--red)] bg-[var(--red-bg)]",
  fatal: "text-[var(--red)] bg-[var(--red-bg)]",
  warning: "text-[var(--amber)] bg-[var(--amber-bg)]",
  warn: "text-[var(--amber)] bg-[var(--amber-bg)]",
  info: "text-[var(--blue)] bg-[var(--blue-bg)]",
  debug: "text-[var(--text2)] bg-[var(--bg3)] font-[family-name:var(--mono)]",
};

export function BreadcrumbsTimeline({ breadcrumbs }: { breadcrumbs: Breadcrumb[] }) {
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] p-6 text-center text-[13px] text-[var(--text3)]">
        No breadcrumbs recorded before this error.
      </div>
    );
  }

  return (
    <div className="relative border-l border-[var(--border)] ml-3 pl-6 space-y-4 py-1">
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
            <div className="absolute -left-[37px] top-1 flex size-6 items-center justify-center rounded-full border border-[var(--border2)] bg-[var(--bg1)] text-[var(--text2)] group-hover:border-[var(--brand)] group-hover:text-[var(--brand)]">
              <Icon className="size-3" />
            </div>

            {/* Breadcrumb row card */}
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg1)] p-3 transition-colors hover:border-[var(--border2)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-[family-name:var(--mono)] text-[9px] font-medium uppercase tracking-[0.08em] ${tone}`}>
                    {level}
                  </span>
                  <span className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-[0.08em] text-[var(--text3)]">
                    {cat}
                  </span>
                  <span className="font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text)] break-all">
                    {msg}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {timeVal && <Timestamp value={timeVal} />}
                  <CopyButton value={msg} label="" className="h-6 border-0 px-1 text-[var(--text3)]" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
