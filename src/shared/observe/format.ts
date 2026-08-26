// Lightweight formatting helpers (native Intl/Date — no date-fns dependency).

function toValidDate(timestamp: number | string | Date | null | undefined): Date | null {
  if (timestamp === null || timestamp === undefined || timestamp === '') return null;
  const d = typeof timestamp === 'number' ? new Date(timestamp) : timestamp instanceof Date ? timestamp : new Date(String(timestamp));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatRelativeTime(timestamp: number | string | Date | null | undefined): string {
  const d = toValidDate(timestamp);
  if (!d) return "—";
  const diff = Date.now() - d.getTime();
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? "ago" : "from now";
  const sec = Math.round(abs / 1000);
  if (sec < 60) return `${sec}s ${suffix}`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ${suffix}`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ${suffix}`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ${suffix}`;
  const mon = Math.round(day / 30);
  if (mon < 12) return `${mon}mo ${suffix}`;
  return `${Math.round(mon / 12)}y ${suffix}`;
}

const ABS_FMT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function formatAbsoluteTime(timestamp: number | string | Date | null | undefined): string {
  const d = toValidDate(timestamp);
  if (!d) return "—";
  return ABS_FMT.format(d);
}

const DATE_FMT = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" });
export function formatDate(timestamp: number | string | Date | null | undefined): string {
  const d = toValidDate(timestamp);
  if (!d) return "—";
  return DATE_FMT.format(d);
}

const NUM_FMT = new Intl.NumberFormat("en-US");
export function formatNumber(value: number): string {
  return NUM_FMT.format(value);
}

const COMPACT_FMT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
export function formatCompact(value: number): string {
  return COMPACT_FMT.format(value);
}

export function formatDuration(ms: number): string {
  if (ms == null || Number.isNaN(Number(ms))) return "0ms";
  const num = Math.round(Number(ms));
  if (num < 1000) return `${num}ms`;
  const s = num / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  if (m < 60) return `${m}m ${rem}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function formatLatency(ms: number): string {
  if (ms == null || Number.isNaN(Number(ms))) return "0ms";
  const num = Number(ms);
  return num >= 1000 ? `${(num / 1000).toFixed(2)}s` : `${Math.round(num)}ms`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
