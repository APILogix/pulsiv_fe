import { Globe, Database, MousePointer, Terminal, AlertTriangle, Layers } from "lucide-react";
import { EmptyNote, formatAbsoluteTime } from "@/shared/observe";
import { cn } from "@/lib/utils";
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

const LEVEL_TEXT: Record<string, string> = {
  error: "text-[var(--red)]",
  fatal: "text-[var(--red)]",
  warning: "text-[var(--amber)]",
  warn: "text-[var(--amber)]",
  info: "text-[var(--text2)]",
  debug: "text-[var(--text3)]",
};

const TIME_FMT = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

function clock(value: unknown) {
  if (!value) return null;
  const d = new Date(typeof value === "number" && value < 1e12 ? value * 1000 : (value as string));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** What happened right before the error, in the order the SDK recorded it. */
export function BreadcrumbsTimeline({ breadcrumbs }: { breadcrumbs: Breadcrumb[] }) {
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return <EmptyNote>No breadcrumbs were recorded before this error. The SDK records HTTP calls, console output, and navigation automatically when breadcrumbs are enabled.</EmptyNote>;
  }

  return (
    <ol className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)]">
      {breadcrumbs.map((item, index) => {
        const cat = String(item.category ?? item.type ?? "log").toLowerCase();
        const Icon = CATEGORY_ICONS[cat] ?? Terminal;
        const level = String(item.level ?? "info").toLowerCase();
        const msg = item.message ?? item.category ?? "Breadcrumb";
        const at = clock(item.timestamp ?? item.occurredAt);
        return (
          <li
            key={index}
            className={cn(
              "grid grid-cols-[76px_16px_88px_minmax(0,1fr)] items-baseline gap-3 border-b border-[var(--border)] bg-[var(--bg1)] px-3 py-2 last:border-0",
              (level === "error" || level === "fatal") && "bg-[var(--red-bg)]",
            )}
          >
            <time className="font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]" title={at ? formatAbsoluteTime(at) : undefined}>
              {at ? TIME_FMT.format(at) : "—"}
            </time>
            <Icon className={cn("size-3.5 self-center", LEVEL_TEXT[level] ?? "text-[var(--text3)]")} aria-hidden="true" />
            <span className={cn("truncate text-[12px]", LEVEL_TEXT[level] ?? "text-[var(--text2)]")}>{cat}</span>
            <span className="break-words font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{msg}</span>
          </li>
        );
      })}
    </ol>
  );
}
