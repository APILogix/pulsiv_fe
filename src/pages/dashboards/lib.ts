// Pure data-derivation helpers shared across dashboards.
// No React, no side effects — safe for the compiler to treat as pure.
import type { RequestEvent } from "@/types/events";

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

export function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// Deterministic pseudo-random series so charts look stable between renders
// without per-render randomness (rules.md — no Math.random in render paths
// that affect keys/identity). Seeded by a string.
export function seededSeries(seed: string, length: number, base: number, variance: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const r = (h / 0x7fffffff) - 0.5;
    out.push(Math.max(0, Math.round(base + Math.sin(i / 3) * variance * 0.6 + r * variance)));
  }
  return out;
}

// Group requests into N evenly-sized time buckets, returning counts.
export function bucketCounts(events: { timestamp: number }[], buckets: number): number[] {
  if (events.length === 0) return Array(buckets).fill(0);
  const times = events.map((e) => e.timestamp);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = max - min || 1;
  const out = Array(buckets).fill(0);
  for (const t of times) {
    const idx = Math.min(buckets - 1, Math.floor(((t - min) / span) * buckets));
    out[idx]++;
  }
  return out;
}

// Map a client IP to a stable pseudo-country for the geo dashboard.
const COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
];
export function countryForIp(ip: string) {
  const first = parseInt(ip.split(".")[0] || "0", 10);
  return COUNTRIES[first % COUNTRIES.length];
}

export function uniqueBy<T, K>(items: T[], key: (item: T) => K): number {
  return new Set(items.map(key)).size;
}

export function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

export function errorRate(requests: RequestEvent[]): number {
  if (requests.length === 0) return 0;
  const errs = requests.filter((r) => r.statusCode >= 500).length;
  return (errs / requests.length) * 100;
}
