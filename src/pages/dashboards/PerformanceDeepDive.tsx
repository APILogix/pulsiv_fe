import { useState } from "react";
import { toast } from "sonner";
import { AiActionButton } from "@/shared/ui/sentinel";
import {
  BoardPage,
  Columns,
  Facts,
  Ledger,
  ModelNote,
  Panel,
  RankList,
  Readouts,
  Segmented,
  TimeChart,
  Trend,
  stateText,
  type State,
  type VerdictItem,
} from "./board/kit";
import { ENDPOINTS, HOURS_24, SERVICES, series, type Endpoint, type Service } from "./board/fixtures";
import { bytes, compact, ms } from "./board/format";

/*
 * Performance overview: where request time goes. Lead ledger ranks endpoints
 * (or services) by latency against the 500ms p99 SLO; a latency heatmap shows
 * when the slow tail appears.
 * Sample data only; getPerformanceBoard() is the seam a live API replaces.
 */

const P99_SLO = 500;
const BUCKETS = ["<25ms", "25–50", "50–100", "100–250", "250–500", "500ms–1s", ">1s"];

function getPerformanceBoard() {
  const totalReq = ENDPOINTS.reduce((a, e) => a + e.requests, 0);
  const wp = (k: "p50" | "p95" | "p99") => Math.round(ENDPOINTS.reduce((a, e) => a + e[k] * e.requests, 0) / totalReq);
  const timeShare = ENDPOINTS.map((e) => ({ e, time: e.requests * e.p50 }));
  const totalTime = timeShare.reduce((a, t) => a + t.time, 0);
  // Hour × latency bucket counts. The slow buckets fill in during the 20:00–22:00 incident window.
  const heat = BUCKETS.map((b, bi) => ({
    label: b,
    cells: series(`heat-${b}`, 24, [34, 52, 60, 38, 14, 4, 1][bi], [10, 14, 16, 12, 6, 2, 1][bi], {
      spikeAt: bi >= 4 ? 21 : undefined,
      spike: [0, 0, 0, 0, 14, 20, 12][bi],
    }),
  }));
  const coldWarm = HOURS_24.slice(0, 6).map((l, i) => ({
    label: l,
    values: { warm: [120, 90, 260, 410, 460, 300][i], cold: [18, 12, 44, 30, 26, 22][i] },
  }));
  return { totalReq, p50: wp("p50"), p95: wp("p95"), p99: wp("p99"), timeShare, totalTime, heat, coldWarm };
}

const hourLabel = (i: number) => `${String(i).padStart(2, "0")}:00`;
const p99State = (v: number): State => (v > P99_SLO * 2 ? "bad" : v > P99_SLO ? "warn" : "ok");

function EndpointDetail({ e, share }: { e: Endpoint; share: number }) {
  const p50 = e.latency.map((v) => Math.round(v * (e.p50 / e.p95)));
  const p99 = e.latency.map((v) => Math.round(v * (e.p99 / e.p95)));
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <Facts
          items={[
            { label: "Service", value: e.service },
            { label: "Bytes out, 24h", value: bytes(e.bytesOut) },
            { label: "Share of request time", value: `${(share * 100).toFixed(1)}%` },
            { label: "P99 against SLO", value: `${(e.p99 / P99_SLO).toFixed(1)}×`, state: p99State(e.p99) === "ok" ? undefined : p99State(e.p99) },
          ]}
        />
        <div className="mt-5">
          <TimeChart
            label={`${e.method} ${e.path} latency percentiles over 24 hours`}
            height={190}
            xLabels={HOURS_24}
            format={(v) => `${Math.round(v)}`}
            pointLabel={hourLabel}
            threshold={{ value: P99_SLO, label: "p99 SLO 500ms", state: "warn" }}
            series={[
              { label: "P50", color: "var(--text3)", data: p50 },
              { label: "P95", color: "var(--text)", data: e.latency },
              { label: "P99", color: e.state === "bad" ? "var(--red)" : "var(--blue)", data: p99 },
            ]}
          />
        </div>
      </div>
      {e.state !== "ok" ? (
        <ModelNote
          title={e.state === "bad" ? "Tail latency is queue wait, not handler time" : "The slow tail tracks batch size"}
          confidence={e.state === "bad" ? 89 : 72}
          action={<AiActionButton onClick={() => toast("Slowest traces opened (sample)")}>Show slowest traces</AiActionButton>}
        >
          {e.state === "bad"
            ? `Spans for ${e.path} spend 78% of p99 waiting on the dispatch queue. Handler time is flat against baseline.`
            : `Requests above 2 MB account for most p99 outliers on ${e.path}. Median time is unchanged.`}
        </ModelNote>
      ) : (
        <p className="rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-3.5 text-[13px] leading-[1.6] text-[var(--text2)]">
          Every percentile is inside the SLO for the full window.
        </p>
      )}
    </div>
  );
}

function ServiceDetail({ s }: { s: Service }) {
  return (
    <div className="min-w-0">
      <Facts
        items={[
          { label: "Apdex", value: s.apdex.toFixed(2), state: s.apdex < 0.8 ? "bad" : s.apdex < 0.9 ? "warn" : undefined },
          { label: "Baseline p95", value: ms(s.p95Base) },
          { label: "Requests per second", value: String(s.rps) },
          { label: "Version", value: s.version },
        ]}
      />
      <div className="mt-5">
        <TimeChart
          label={`${s.id} p95 latency over 24 hours`}
          height={180}
          xLabels={HOURS_24}
          format={(v) => `${Math.round(v)}`}
          pointLabel={hourLabel}
          threshold={{ value: s.p95Base, label: `baseline ${s.p95Base}ms` }}
          series={[{ label: "P95 ms", color: s.state === "bad" ? "var(--red)" : "var(--text)", data: s.latency }]}
        />
      </div>
    </div>
  );
}

/** Hour × latency bucket grid. Intensity is request share; slow buckets tint by state. */
function LatencyHeatmap({ rows }: { rows: { label: string; cells: number[] }[] }) {
  const max = Math.max(...rows.flatMap((r) => r.cells), 1);
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-[3px]" aria-label="Requests by hour of day and latency bucket">
        <tbody>
          {[...rows].reverse().map((r, ri) => {
            const bi = rows.length - 1 - ri;
            const tint = bi >= 5 ? "var(--red)" : bi === 4 ? "var(--amber)" : "var(--text)";
            return (
              <tr key={r.label}>
                <th scope="row" className="w-20 pr-2 text-right font-mono text-[11px] font-normal text-[var(--text3)]">
                  {r.label}
                </th>
                {r.cells.map((c, i) => (
                  <td
                    key={i}
                    title={`${hourLabel(i)} · ${r.label}: ${c} requests (thousands)`}
                    className="h-5 rounded-[2px]"
                    style={{ background: `color-mix(in oklab, ${tint} ${Math.round(6 + (c / max) * 80)}%, var(--bg2))` }}
                  />
                ))}
              </tr>
            );
          })}
          <tr>
            <td />
            {Array.from({ length: 24 }, (_, i) => (
              <td key={i} className="pt-1 text-center font-mono text-[10px] text-[var(--text3)]">
                {i % 4 === 0 ? String(i).padStart(2, "0") : ""}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function PerformanceDeepDive() {
  const [view, setView] = useState<"endpoint" | "service">("endpoint");
  const { totalReq, p50, p95, p99, timeShare, totalTime, heat, coldWarm } = getPerformanceBoard();
  const shareOf = (e: Endpoint) => (timeShare.find((t) => t.e.id === e.id)?.time ?? 0) / totalTime;
  const slowest = [...ENDPOINTS].sort((a, b) => b.p99 - a.p99)[0];
  const over = ENDPOINTS.filter((e) => e.p99 > P99_SLO);

  const verdict: VerdictItem[] = [
    ...(over.length ? [{ state: "bad" as const, text: `${over.length} endpoints over the 500ms p99 SLO` }] : []),
    { state: "ok", text: `${ENDPOINTS.length - over.length} within SLO` },
  ];

  const switcher = (
    <Segmented
      label="Rank by"
      value={view}
      onChange={setView}
      options={[
        { value: "endpoint", label: "By endpoint" },
        { value: "service", label: "By service" },
      ]}
    />
  );

  return (
    <BoardPage title="Performance overview" description="Where request time is spent, and which routes break the latency SLO." verdict={verdict}>
      <Readouts
        items={[
          { label: "P50", value: ms(p50), delta: "−2ms", verdict: "good", note: "request-weighted" },
          { label: "P95", value: ms(p95), delta: "+14ms", verdict: "bad", note: "vs previous 24h" },
          { label: "P99", value: ms(p99), delta: "+61ms", verdict: "bad", note: "SLO 500ms", state: p99 > P99_SLO ? "warn" : undefined },
          { label: "Apdex", value: "0.91", delta: "−0.02", verdict: "bad", note: "T = 250ms" },
          { label: "Throughput", value: compact(totalReq), note: "requests, 24h" },
          { label: "Slowest route", value: ms(slowest.p99), note: `${slowest.method} ${slowest.path}`, state: p99State(slowest.p99) },
        ]}
      />

      {view === "endpoint" ? (
        <Ledger
          id="endpoint"
          title="Endpoints"
          meta="Worst p99 first"
          action={switcher}
          rows={ENDPOINTS}
          rowId={(e) => e.id}
          rowState={(e) => (e.p99 > P99_SLO * 2 ? "bad" : e.p99 > P99_SLO ? "warn" : e.state === "bad" ? "warn" : "ok")}
          attention={(e) => e.p99}
          primary={{
            header: "Endpoint",
            cell: (e) => (
              <span className="font-mono">
                <span className="mr-2 text-[11px] text-[var(--text3)]">{e.method}</span>
                {e.path}
              </span>
            ),
            sub: (e) => e.service,
          }}
          columns={[
            { key: "trend", header: "P95, 24h", hide: "lg", cell: (e) => <Trend data={e.latency} state={p99State(e.p99)} label={`${e.path} p95 per hour`} /> },
            { key: "p50", header: "P50", align: "right", hide: "md", sortValue: (e) => e.p50, cell: (e) => ms(e.p50) },
            { key: "p95", header: "P95", align: "right", sortValue: (e) => e.p95, cell: (e) => <span className="text-[var(--text)]">{ms(e.p95)}</span> },
            { key: "p99", header: "P99", align: "right", sortValue: (e) => e.p99, cell: (e) => <span style={{ color: stateText(p99State(e.p99)) }}>{ms(e.p99)}</span> },
            { key: "req", header: "Requests", align: "right", hide: "sm", sortValue: (e) => e.requests, cell: (e) => compact(e.requests) },
          ]}
          detail={(e) => <EndpointDetail e={e} share={shareOf(e)} />}
        />
      ) : (
        <Ledger
          id="svc"
          title="Services"
          meta="Worst p95 against baseline first"
          action={switcher}
          rows={SERVICES}
          rowId={(s) => s.id}
          rowState={(s) => s.state}
          attention={(s) => s.p95 / s.p95Base}
          primary={{ header: "Service", cell: (s) => <span className="font-mono">{s.id}</span>, sub: (s) => `${s.team} · ${s.version}` }}
          columns={[
            { key: "trend", header: "P95, 24h", hide: "lg", cell: (s) => <Trend data={s.latency} state={s.state} label={`${s.id} p95 per hour`} /> },
            { key: "base", header: "Baseline", align: "right", hide: "md", cell: (s) => ms(s.p95Base) },
            { key: "p95", header: "P95", align: "right", sortValue: (s) => s.p95, cell: (s) => <span style={{ color: stateText(s.state) }}>{ms(s.p95)}</span> },
            { key: "apdex", header: "Apdex", align: "right", sortValue: (s) => s.apdex, cell: (s) => s.apdex.toFixed(2) },
            { key: "rps", header: "Req/s", align: "right", hide: "sm", sortValue: (s) => s.rps, cell: (s) => s.rps },
          ]}
          detail={(s) => <ServiceDetail s={s} />}
        />
      )}

      <Panel title="Latency distribution" meta="Requests by hour and latency bucket">
        <LatencyHeatmap rows={heat} />
        <p className="mt-3 text-[12px] text-[var(--text3)]">
          The slow tail appears between 20:00 and 22:00, when requests above 250ms rise from 4% to 19% of traffic.
        </p>
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Where request time goes" meta="Requests × median latency">
          <RankList
            label="Endpoints ranked by share of total request time"
            format={(v) => `${(v * 100).toFixed(1)}%`}
            items={[...timeShare]
              .sort((a, b) => b.time - a.time)
              .slice(0, 6)
              .map((t) => ({ label: `${t.e.method} ${t.e.path}`, value: t.time / totalTime, state: t.e.state === "bad" ? "bad" : undefined }))}
          />
        </Panel>
        <Panel title="Cold and warm starts" meta="Serverless handlers, 4-hour buckets">
          <Columns
            label="Warm and cold starts in four-hour buckets"
            format={compact}
            buckets={coldWarm}
            keys={[
              { key: "warm", label: "Warm", color: "var(--border2)" },
              { key: "cold", label: "Cold", color: "var(--blue)" },
            ]}
          />
        </Panel>
      </div>
    </BoardPage>
  );
}
