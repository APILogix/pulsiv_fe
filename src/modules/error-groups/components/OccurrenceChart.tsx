import { useState } from "react";
import type { ErrorGroup } from "../types/error-group";

interface OccurrenceChartProps {
  group: ErrorGroup;
}

export function OccurrenceChart({ group }: OccurrenceChartProps) {
  const [range, setRange] = useState<"24h" | "7d" | "30d">("24h");

  const data =
    range === "24h"
      ? group.trend24h
      : range === "7d"
      ? group.trend7d
      : group.trend30d;

  const pointsData = data ?? [];
  const max = Math.max(...pointsData, 1);
  const min = Math.min(...pointsData, 0);
  const rangeVal = max - min || 1;
  const width = 600;
  const height = 120;
  const step = width / (pointsData.length - 1 || 1);

  const points = pointsData
    .map((d, i) => `${i * step},${height - ((d - min) / rangeVal) * height * 0.85 - 5}`)
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--text)]">Occurrence Trend</h3>
          <p className="text-[12px] text-[var(--text3)]">Occurrence volume over time</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-1 font-[family-name:var(--mono)] text-[11px]">
          {(["24h", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded px-2.5 py-1 transition-colors cursor-pointer ${
                range === r
                  ? "bg-[var(--brand)] text-[var(--bg)] font-semibold"
                  : "text-[var(--text2)] hover:text-[var(--text)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[140px] overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--amber)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--amber)" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {/* Fill Area */}
          <polygon points={areaPoints} fill="url(#chartGradient)" />
          {/* Stroke Line */}
          <polyline
            points={points}
            fill="none"
            stroke="var(--amber)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className="mt-2 flex justify-between font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
          <span>{range === "24h" ? "24h ago" : range === "7d" ? "7d ago" : "30d ago"}</span>
          <span>Now</span>
        </div>
      </div>
    </div>
  );
}
