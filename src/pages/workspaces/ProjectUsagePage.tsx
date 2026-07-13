import { useProjectUsage } from "@/modules/projects/hooks/useProjects";
import { PageHeader, SectionCard, MetricSparkline, formatCompact } from "@/shared/observe";
import { useCurrentProject } from "./ProjectShellPage";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, Zap, Clock, Key } from "lucide-react";

/* ── deterministic seed from project ID ── */
function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h * 16807 + 0) % 2147483647;
    return (h & 0x7fffffff) / 0x7fffffff;
  };
}

/* ── generate heatmap data (24h x 7d) ── */
function generateHeatmapData(projectId: string) {
  const rng = seededRandom(projectId);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const grid: { day: string; hour: number; value: number }[] = [];

  for (const day of days) {
    for (const hour of hours) {
      // simulate realistic traffic: higher during business hours, lower on weekends
      const isWeekend = day === "Sat" || day === "Sun";
      const isBusinessHour = hour >= 8 && hour <= 20;
      const base = isWeekend ? 15 : isBusinessHour ? 70 : 25;
      const peakBoost = hour >= 10 && hour <= 14 && !isWeekend ? 30 : 0;
      const value = Math.max(0, Math.round(base + peakBoost + rng() * 30 - 10));
      grid.push({ day, hour, value });
    }
  }
  return { grid, days, hours };
}

/* ── generate 30-day usage trend ── */
function generateUsageTrend(projectId: string) {
  const rng = seededRandom(projectId + "_trend");
  return Array.from({ length: 30 }, (_, i) => {
    const base = 1200 + i * 40;
    return Math.round(base + rng() * 600 - 200);
  });
}

/* ── generate hourly breakdown for today ── */
function generateHourlyBreakdown(projectId: string) {
  const rng = seededRandom(projectId + "_hourly");
  const now = new Date().getHours();
  return Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    events: i <= now ? Math.round(400 + rng() * 800 + (i >= 9 && i <= 17 ? 600 : 0)) : 0,
    errors: i <= now ? Math.round(rng() * 30 + (i >= 9 && i <= 17 ? 15 : 3)) : 0,
  }));
}

/* ── heatmap color scale ── */
function heatColor(value: number, max: number): string {
  const ratio = Math.min(value / max, 1);
  if (ratio === 0) return "rgba(255,255,255,0.03)";
  if (ratio < 0.2) return "rgba(16,185,129,0.15)";
  if (ratio < 0.4) return "rgba(16,185,129,0.3)";
  if (ratio < 0.6) return "rgba(16,185,129,0.5)";
  if (ratio < 0.8) return "rgba(16,185,129,0.7)";
  return "rgba(16,185,129,0.9)";
}

/* ── mini trend arrow ── */
function TrendIndicator({ value, suffix = "%" }: { value: number; suffix?: string }) {
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-[12px] font-medium text-emerald-400">
        <ArrowUpRight className="size-3" />
        +{value.toFixed(1)}{suffix}
      </span>
    );
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-[12px] font-medium text-red-400">
        <ArrowDownRight className="size-3" />
        {value.toFixed(1)}{suffix}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-[12px] font-medium text-[var(--text3)]">
      <Minus className="size-3" />
      0{suffix}
    </span>
  );
}

/* ── bar chart component ── */
interface BarChartDatum {
  id: string;
  value: number;
}

function BarChart({ data, maxVal, color = "var(--brand)" }: { data: BarChartDatum[]; maxVal: number; color?: string }) {
  return (
    <div className="flex items-end gap-[2px] h-[100px]">
      {data.map((point) => {
        const h = maxVal > 0 ? (point.value / maxVal) * 100 : 0;
        return (
          <div
            key={point.id}
            className="flex-1 rounded-t-sm transition-all duration-200 hover:opacity-80 group relative min-w-[4px]"
            style={{ height: `${Math.max(h, 1)}%`, background: point.value > 0 ? color : "rgba(255,255,255,0.04)" }}
          >
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[var(--bg3)] text-[var(--text)] text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
              {formatCompact(point.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ProjectUsagePage() {
  const { project: p, projectId } = useCurrentProject();
  useProjectUsage(projectId);

  const heatmap = generateHeatmapData(projectId);
  const trend30d = generateUsageTrend(projectId);
  const hourly = generateHourlyBreakdown(projectId);

  const maxHeat = Math.max(...heatmap.grid.map((c) => c.value));
  const totalEvents = trend30d.reduce((s, v) => s + v, 0);
  const avgDaily = Math.round(totalEvents / 30);
  const todayEvents = hourly.reduce((s, h) => s + h.events, 0);
  const todayErrors = hourly.reduce((s, h) => s + h.errors, 0);
  const errorRate = todayEvents > 0 ? ((todayErrors / todayEvents) * 100) : 0;
  const maxHourlyEvents = Math.max(...hourly.map((h) => h.events), 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usage & Analytics"
        description={`Real-time and historical usage metrics for ${p.name}.`}
        breadcrumbs={[
          { label: "Workspaces" },
          { label: "Projects", to: "/projects" },
          { label: p.name, to: `/projects/${p.id}/overview` },
          { label: "Usage" },
        ]}
      />

      {/* ── KPI Row ── */}
      <div className="flex flex-col lg:flex-row rounded-xl border border-[var(--border)] bg-[var(--bg1)] divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)] overflow-hidden">
        <div className="flex-1 p-5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--text3)] text-[12px] font-medium uppercase tracking-wider">
              <TrendingUp className="size-3.5" /> Total Events (30d)
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-[var(--text)] tabular-nums">{formatCompact(totalEvents)}</div>
            <MetricSparkline data={trend30d} width={60} height={20} color="var(--brand)" />
          </div>
          <TrendIndicator value={12.4} />
        </div>
        <div className="flex-1 p-5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--text3)] text-[12px] font-medium uppercase tracking-wider">
              <Zap className="size-3.5" /> Avg Daily
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-[var(--text)] tabular-nums">{formatCompact(avgDaily)}</div>
            <MetricSparkline data={hourly.map(h => h.events)} width={60} height={20} color="var(--brand)" />
          </div>
          <TrendIndicator value={5.2} />
        </div>
        <div className="flex-1 p-5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--text3)] text-[12px] font-medium uppercase tracking-wider">
              <Key className="size-3.5" /> API Keys
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text)] tabular-nums">
            {p.activeApiKeysCount}<span className="text-sm font-normal text-[var(--text3)]"> / {p.apiKeysCount}</span>
          </div>
          <span className="text-[12px] text-[var(--text3)]">active / total</span>
        </div>
        <div className="flex-1 p-5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--text3)] text-[12px] font-medium uppercase tracking-wider">
              <Clock className="size-3.5" /> Error Rate (today)
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold tabular-nums" style={{ color: errorRate > 5 ? "var(--red)" : errorRate > 2 ? "var(--amber, #f59e0b)" : "var(--green, #10b981)" }}>
              {errorRate.toFixed(2)}%
            </div>
            <MetricSparkline data={hourly.map(h => h.errors)} width={60} height={20} color={errorRate > 2 ? "var(--red)" : "var(--green)"} />
          </div>
          <TrendIndicator value={errorRate > 3 ? 0.8 : -1.2} />
        </div>
      </div>

      {/* ── Activity Heatmap ── */}
      <SectionCard title="Activity Heatmap" className="overflow-x-auto">
        <p className="text-[12px] text-[var(--text3)] mb-4">Event volume by hour and day of week — last 7 days</p>
        <div className="inline-block min-w-[700px]">
          {/* Hour labels */}
          <div className="flex ml-[56px] mb-1">
            {heatmap.hours.map((h) => (
              <div key={h} className="flex-1 text-center text-[10px] text-[var(--text3)] tabular-nums">
                {h % 3 === 0 ? `${h.toString().padStart(2, "0")}` : ""}
              </div>
            ))}
          </div>
          {/* Rows */}
          {heatmap.days.map((day) => (
            <div key={day} className="flex items-center gap-1 mb-[3px]">
              <span className="w-[52px] text-right text-[11px] text-[var(--text3)] pr-2 shrink-0">{day}</span>
              {heatmap.hours.map((hour) => {
                const cell = heatmap.grid.find((c) => c.day === day && c.hour === hour)!;
                return (
                  <div
                    key={hour}
                    className="flex-1 aspect-square rounded-[3px] transition-colors cursor-default group relative"
                    style={{ background: heatColor(cell.value, maxHeat) }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--bg3)] text-[var(--text)] text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg border border-[var(--border)]">
                      {day} {hour}:00 — <strong>{cell.value}</strong> events
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 ml-[56px]">
            <span className="text-[10px] text-[var(--text3)]">Less</span>
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((r) => (
              <div
                key={r}
                className="w-3 h-3 rounded-[2px]"
                style={{ background: heatColor(r * maxHeat, maxHeat) }}
              />
            ))}
            <span className="text-[10px] text-[var(--text3)]">More</span>
          </div>
        </div>
      </SectionCard>

      {/* ── Bottom Row: Trend + Today Breakdown ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 30-day trend */}
        <SectionCard title="30-Day Event Trend">
          <div className="flex items-end gap-3 mb-3">
            <span className="text-xl font-bold text-[var(--text)] tabular-nums">{formatCompact(totalEvents)}</span>
            <TrendIndicator value={12.4} />
          </div>
          <MetricSparkline data={trend30d} color="var(--brand)" width={520} height={100} />
          <div className="flex justify-between mt-2 text-[10px] text-[var(--text3)]">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </SectionCard>

        {/* Today's hourly breakdown */}
        <SectionCard title="Today's Hourly Breakdown">
          <div className="flex items-end gap-3 mb-3">
            <span className="text-xl font-bold text-[var(--text)] tabular-nums">{formatCompact(todayEvents)}</span>
            <span className="text-[12px] text-[var(--text3)]">events today</span>
          </div>
          <BarChart
            data={hourly.map((h) => ({ id: String(h.hour), value: h.events }))}
            maxVal={maxHourlyEvents}
            color="rgba(16,185,129,0.6)"
          />
          <div className="flex justify-between mt-2 text-[10px] text-[var(--text3)] tabular-nums">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </SectionCard>
      </div>

      {/* ── Environment & Key Breakdown ── */}
      <SectionCard title="Environment & Key Metrics">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Environment */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase text-[var(--text3)] tracking-wider font-medium">Default Environment</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[15px] font-semibold text-[var(--text)] capitalize">{p.defaultEnvironment}</span>
            </div>
          </div>
          {/* Key utilization */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase text-[var(--text3)] tracking-wider font-medium">Key Utilization</span>
            <div className="w-full h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                style={{ width: `${p.apiKeysCount > 0 ? (p.activeApiKeysCount / p.apiKeysCount) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[12px] text-[var(--text2)] tabular-nums">
              {p.activeApiKeysCount} of {p.apiKeysCount} keys active ({p.apiKeysCount > 0 ? Math.round((p.activeApiKeysCount / p.apiKeysCount) * 100) : 0}%)
            </span>
          </div>
          {/* Status */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase text-[var(--text3)] tracking-wider font-medium">Project Status</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${p.status === "active" ? "bg-emerald-500" : p.status === "suspended" ? "bg-amber-500" : "bg-red-500"}`} />
              <span className="text-[15px] font-semibold text-[var(--text)] capitalize">{p.status}</span>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
