import { useState } from "react";
import { toast } from "sonner";
import { AiActionButton } from "@/shared/ui/sentinel";
import {
  BoardPage,
  Facts,
  Ledger,
  Meter,
  ModelNote,
  Panel,
  Readouts,
  STATE_COLOR,
  TimeChart,
  stateText,
  type State,
  type VerdictItem,
} from "./board/kit";
import { HOURS_24, series } from "./board/fixtures";
import { compact, ms, pct } from "./board/format";

/*
 * Service map: which dependency is slowing requests. A three-column topology
 * (callers → services → data stores) with edges weighted by calls and lit only
 * when they breach; the edge ledger carries the numbers.
 * Sample data only; getServiceMapBoard() is the seam a live API replaces.
 */

type Col = 0 | 1 | 2;
interface Node {
  id: string;
  col: Col;
  row: number;
  state: State;
}
interface Edge {
  from: string;
  to: string;
  calls: number; // per minute
  p95: number;
  errorRate: number;
  share: number; // % of caller's time
  state: State;
  latency: number[];
}

const NODES: Node[] = [
  { id: "web-sdk", col: 0, row: 0, state: "ok" },
  { id: "server-sdk", col: 0, row: 1, state: "ok" },
  { id: "mobile-sdk", col: 0, row: 2, state: "ok" },
  { id: "ingest-gateway", col: 1, row: 0, state: "warn" },
  { id: "query-engine", col: 1, row: 1, state: "ok" },
  { id: "alert-dispatcher", col: 1, row: 2, state: "bad" },
  { id: "auth-service", col: 1, row: 3, state: "ok" },
  { id: "kafka-events", col: 2, row: 0, state: "bad" },
  { id: "postgres-primary", col: 2, row: 1, state: "ok" },
  { id: "pg-read-2", col: 2, row: 2, state: "warn" },
  { id: "redis-cache", col: 2, row: 3, state: "ok" },
  { id: "s3-archive", col: 2, row: 4, state: "ok" },
];

function e(from: string, to: string, calls: number, p95: number, errorRate: number, share: number, state: State): Edge {
  return { from, to, calls, p95, errorRate, share, state, latency: series(`edge-${from}-${to}`, 24, p95 * 0.7, p95 * 0.35, { diurnal: false, spikeAt: state === "bad" ? 21 : undefined, spike: p95 * 0.6, floor: 1 }) };
}

const EDGES: Edge[] = [
  e("web-sdk", "ingest-gateway", 8_400, 180, 0.2, 62, "ok"),
  e("server-sdk", "ingest-gateway", 14_900, 211, 0.31, 70, "warn"),
  e("mobile-sdk", "ingest-gateway", 3_100, 240, 0.4, 66, "warn"),
  e("web-sdk", "query-engine", 5_200, 96, 0.1, 31, "ok"),
  e("server-sdk", "auth-service", 2_600, 22, 0.02, 8, "ok"),
  e("ingest-gateway", "kafka-events", 26_000, 38, 0.01, 18, "ok"),
  e("alert-dispatcher", "kafka-events", 820, 1_900, 3.9, 78, "bad"),
  e("query-engine", "postgres-primary", 1_900, 42, 0.02, 21, "ok"),
  e("query-engine", "pg-read-2", 7_400, 188, 0.44, 57, "warn"),
  e("query-engine", "redis-cache", 18_200, 3, 0, 4, "ok"),
  e("alert-dispatcher", "postgres-primary", 640, 58, 0.1, 9, "ok"),
  e("ingest-gateway", "s3-archive", 1_100, 120, 0.05, 6, "ok"),
  e("auth-service", "redis-cache", 2_900, 2, 0, 12, "ok"),
];

const TRACES = [
  { id: "7f3a9c21e0b4", root: "POST /v1/alerts/dispatch", duration: 4_812, spans: 42, via: "alert-dispatcher → kafka-events", state: "bad" as State },
  { id: "c01d77ab9e52", root: "POST /v1/alerts/dispatch", duration: 3_904, spans: 38, via: "alert-dispatcher → kafka-events", state: "bad" as State },
  { id: "4be2f90d13aa", root: "GET /v1/traces/:id", duration: 1_630, spans: 118, via: "query-engine → pg-read-2", state: "warn" as State },
  { id: "9ad0c4e87f16", root: "POST /v1/ingest", duration: 1_210, spans: 12, via: "server-sdk → ingest-gateway", state: "warn" as State },
  { id: "e5719b2c0d38", root: "GET /v1/search", duration: 640, spans: 24, via: "query-engine → pg-read-2", state: "ok" as State },
];

const QUERIES = [
  { sql: "SELECT * FROM spans WHERE trace_id = $1 ORDER BY start_ts", db: "pg-read-2", calls: 7_400, mean: 61, p95: 188, rows: 118, state: "warn" as State },
  { sql: "INSERT INTO notifications (rule_id, payload) VALUES ($1, $2)", db: "postgres-primary", calls: 640, mean: 21, p95: 58, rows: 1, state: "ok" as State },
  { sql: "SELECT id, name FROM projects WHERE org_id = $1", db: "postgres-primary", calls: 1_900, mean: 9, p95: 42, rows: 14, state: "ok" as State },
  { sql: "UPDATE error_groups SET last_seen = now() WHERE fingerprint = $1", db: "postgres-primary", calls: 1_240, mean: 14, p95: 36, rows: 1, state: "ok" as State },
  { sql: "SELECT count(*) FROM events WHERE project_id = $1 AND ts > $2", db: "pg-read-2", calls: 980, mean: 142, p95: 410, rows: 1, state: "warn" as State },
];

function getServiceMapBoard() {
  return { nodes: NODES, edges: EDGES, traces: TRACES, queries: QUERIES };
}

/* ── Topology diagram ──────────────────────────────────────────────────── */

const COL_X = [24, 330, 636];
const NODE_W = 170;
const NODE_H = 34;
const ROW_GAP = 52;
const TOP = 40;

function nodePos(n: Node) {
  const rows = NODES.filter((m) => m.col === n.col).length;
  const offset = ((5 - rows) * ROW_GAP) / 2;
  return { x: COL_X[n.col], y: TOP + offset + n.row * ROW_GAP };
}

function Topology({ focus, setFocus }: { focus: string | null; setFocus: (id: string | null) => void }) {
  const byId = new Map(NODES.map((n) => [n.id, n]));
  const maxCalls = Math.max(...EDGES.map((x) => x.calls));
  const related = (edge: Edge) => focus === null || edge.from === focus || edge.to === focus;
  return (
    <svg viewBox="0 0 830 300" className="block h-auto w-full" role="group" aria-label="Service topology: callers, services and data stores">
      {["Callers", "Services", "Data stores"].map((h, i) => (
        <text key={h} x={COL_X[i]} y={18} fill="var(--text3)" fontSize={12} fontFamily="Inter, sans-serif">
          {h}
        </text>
      ))}
      {EDGES.map((edge) => {
        const a = nodePos(byId.get(edge.from)!);
        const b = nodePos(byId.get(edge.to)!);
        const x1 = a.x + NODE_W;
        const y1 = a.y + NODE_H / 2;
        const x2 = b.x;
        const y2 = b.y + NODE_H / 2;
        const mid = (x1 + x2) / 2;
        const hot = edge.state === "bad" || edge.state === "warn";
        return (
          <path
            key={`${edge.from}-${edge.to}`}
            d={`M${x1},${y1} H${mid} V${y2} H${x2}`}
            fill="none"
            stroke={hot ? STATE_COLOR[edge.state] : "var(--border2)"}
            strokeWidth={1 + (edge.calls / maxCalls) * 2.5}
            strokeOpacity={related(edge) ? 1 : 0.15}
            style={{ transition: "stroke-opacity 150ms" }}
          />
        );
      })}
      {NODES.map((n) => {
        const p = nodePos(n);
        const dim = focus !== null && focus !== n.id && !EDGES.some((x) => (x.from === focus && x.to === n.id) || (x.to === focus && x.from === n.id));
        return (
          <g
            key={n.id}
            tabIndex={0}
            role="button"
            aria-label={`${n.id}, ${n.state === "ok" ? "healthy" : n.state === "warn" ? "degraded" : "failing"}. Highlight its connections.`}
            onMouseEnter={() => setFocus(n.id)}
            onMouseLeave={() => setFocus(null)}
            onFocus={() => setFocus(n.id)}
            onBlur={() => setFocus(null)}
            className="cursor-pointer outline-none [&:focus-visible>rect:first-child]:stroke-[var(--text)]"
            opacity={dim ? 0.35 : 1}
            style={{ transition: "opacity 150ms" }}
          >
            <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={6} fill="var(--bg2)" stroke={focus === n.id ? "var(--text2)" : "var(--border)"} strokeWidth={1} />
            <rect x={p.x + 12} y={p.y + NODE_H / 2 - 4} width={8} height={8} rx={2} fill={STATE_COLOR[n.state === "ok" ? "ok" : n.state]} />
            <text x={p.x + 28} y={p.y + NODE_H / 2 + 4} fill="var(--text)" fontSize={12} fontFamily="'JetBrains Mono', monospace">
              {n.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const hourLabel = (i: number) => `${String(i).padStart(2, "0")}:00`;

function EdgeDetail({ edge }: { edge: Edge }) {
  const through = TRACES.filter((t) => t.via === `${edge.from} → ${edge.to}`);
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <Facts
          items={[
            { label: "Calls per minute", value: compact(edge.calls) },
            { label: "P95", value: ms(edge.p95), state: edge.state === "ok" ? undefined : edge.state },
            { label: "Error rate", value: pct(edge.errorRate) },
            { label: "Share of caller time", value: `${edge.share}%` },
          ]}
        />
        <div className="mt-5">
          <TimeChart
            label={`${edge.from} to ${edge.to} p95 over 24 hours`}
            height={170}
            xLabels={HOURS_24}
            format={(v) => ms(v)}
            pointLabel={hourLabel}
            series={[{ label: "P95", color: edge.state === "bad" ? "var(--red)" : "var(--text)", data: edge.latency }]}
          />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        {edge.state === "bad" && (
          <ModelNote
            title="Producer is blocked on broker acks"
            confidence={90}
            action={<AiActionButton onClick={() => toast("Config diff opened (sample)")}>Compare producer config</AiActionButton>}
          >
            v3.8.2 switched alert-dispatcher to acks=all with one in-sync replica lagging. Every publish waits on the slow replica.
          </ModelNote>
        )}
        <div>
          <p className="text-[12px] text-[var(--text3)]">Slowest traces through this edge</p>
          {through.length ? (
            <ul className="mt-1.5 divide-y divide-[var(--border)] text-[12px]">
              {through.map((t) => (
                <li key={t.id} className="flex items-baseline justify-between gap-3 py-1.5 font-mono">
                  <span className="truncate text-[var(--text)]">{t.id}</span>
                  <span className="shrink-0 text-[var(--text3)]">{t.spans} spans</span>
                  <span className="shrink-0" style={{ color: stateText(t.state) }}>{ms(t.duration)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-[13px] text-[var(--text2)]">No sampled trace above 500ms used this edge today.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TracingDependencyMap() {
  const [focus, setFocus] = useState<string | null>(null);
  const { nodes, edges, traces, queries } = getServiceMapBoard();
  const slowest = [...edges].sort((a, b) => b.p95 - a.p95)[0];
  const errorProne = [...edges].sort((a, b) => b.errorRate - a.errorRate)[0];
  const hot = edges.filter((x) => x.state !== "ok");

  const verdict: VerdictItem[] = [
    { state: "bad", text: `${slowest.from} → ${slowest.to} at ${ms(slowest.p95)} p95` },
    { state: "warn", text: `${hot.length - 1} more edges above baseline` },
    { state: "ok", text: `${edges.length - hot.length} healthy` },
  ];

  return (
    <BoardPage title="Service map" description="How requests move between services and data stores, and which hop adds the time." verdict={verdict}>
      <Readouts
        items={[
          { label: "Services and stores", value: String(nodes.length), note: "seen in traces today" },
          { label: "Dependencies", value: String(edges.length), note: `${hot.length} above baseline` },
          { label: "Traces sampled", value: "184K", note: "10% head sampling" },
          { label: "Slowest hop", value: ms(slowest.p95), note: `${slowest.from} → ${slowest.to}`, state: slowest.state },
          { label: "Most errors", value: pct(errorProne.errorRate), note: `${errorProne.from} → ${errorProne.to}`, state: errorProne.state },
          { label: "Time in databases", value: "34%", delta: "+6 pts", verdict: "bad", note: "of total span time" },
        ]}
      />

      <Panel title="Topology" meta="Line weight is call volume. Hover or focus a node to trace its connections.">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <Topology focus={focus} setFocus={setFocus} />
          </div>
        </div>
      </Panel>

      <Ledger
        id="edge"
        title="Dependencies"
        meta="Worst hop first"
        rows={edges}
        rowId={(x) => `${x.from}>${x.to}`}
        rowState={(x) => x.state}
        attention={(x) => x.p95}
        primary={{
          header: "Caller → callee",
          cell: (x) => (
            <span className="font-mono">
              {x.from} <span className="text-[var(--text3)]">→</span> {x.to}
            </span>
          ),
        }}
        columns={[
          { key: "calls", header: "Calls/min", align: "right", sortValue: (x) => x.calls, cell: (x) => compact(x.calls) },
          { key: "p95", header: "P95", align: "right", sortValue: (x) => x.p95, cell: (x) => <span style={{ color: stateText(x.state) }}>{ms(x.p95)}</span> },
          { key: "err", header: "Errors", align: "right", hide: "md", sortValue: (x) => x.errorRate, cell: (x) => pct(x.errorRate) },
          {
            key: "share",
            header: "Share of caller time",
            align: "right",
            hide: "lg",
            className: "w-[180px]",
            sortValue: (x) => x.share,
            cell: (x) => (
              <span className="flex items-center justify-end gap-3">
                <Meter value={x.share} max={100} state={x.state} className="w-16" />
                <span className="w-9">{x.share}%</span>
              </span>
            ),
          },
        ]}
        detail={(x) => <EdgeDetail edge={x} />}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Ledger
          id="trace"
          title="Slowest traces"
          meta="Today, sampled"
          filter={false}
          rows={traces}
          rowId={(t) => t.id}
          rowState={(t) => t.state}
          attention={(t) => t.duration}
          primary={{ header: "Trace", cell: (t) => <span className="font-mono">{t.id}</span>, sub: (t) => t.root }}
          columns={[
            { key: "spans", header: "Spans", align: "right", cell: (t) => t.spans },
            { key: "dur", header: "Duration", align: "right", cell: (t) => <span style={{ color: stateText(t.state) }}>{ms(t.duration)}</span> },
          ]}
        />
        <Ledger
          id="query"
          title="Database queries"
          meta="Slowest normalized statements"
          filter={false}
          rows={queries}
          rowId={(q) => q.sql}
          rowState={(q) => q.state}
          attention={(q) => q.p95}
          primary={{ header: "Statement", cell: (q) => <span className="font-mono text-[12px]">{q.sql}</span>, sub: (q) => q.db }}
          columns={[
            { key: "calls", header: "Calls/min", align: "right", hide: "md", cell: (q) => compact(q.calls) },
            { key: "p95", header: "P95", align: "right", cell: (q) => <span style={{ color: stateText(q.state) }}>{ms(q.p95)}</span> },
          ]}
        />
      </div>
    </BoardPage>
  );
}
