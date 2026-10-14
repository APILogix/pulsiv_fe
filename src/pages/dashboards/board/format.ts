// Formatting for board readings. Pure, locale-stable, mono-friendly.

export function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${trim(n / 1e9)}B`;
  if (abs >= 1e6) return `${trim(n / 1e6)}M`;
  if (abs >= 1e3) return `${trim(n / 1e3)}K`;
  return `${Math.round(n)}`;
}

function trim(v: number): string {
  const s = Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
  return s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function ms(v: number): string {
  if (v >= 10_000) return `${(v / 1000).toFixed(1)}s`;
  if (v >= 1000) return `${(v / 1000).toFixed(2)}s`;
  return `${Math.round(v)}ms`;
}

export function pct(v: number, digits = 2): string {
  return `${v.toFixed(digits)}%`;
}

export function money(v: number): string {
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function bytes(v: number): string {
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)} TB`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} GB`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} MB`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)} KB`;
  return `${v} B`;
}

/** Signed figure with a real minus sign, e.g. "+12.4%" or "−22ms". */
export function signed(v: number, unit = "", digits = 1): string {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "±";
  return `${sign}${Math.abs(v).toFixed(digits)}${unit}`;
}
