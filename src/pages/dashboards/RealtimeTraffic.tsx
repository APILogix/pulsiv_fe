import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import {
  BoardButton,
  BoardPage,
  Ledger,
  Panel,
  RankList,
  Readouts,
  SplitBar,
  TimeChart,
  Trend,
  stateText,
  type State,
  type VerdictItem,
} from "./board/kit";
import { ENDPOINTS, series, type Endpoint } from "./board/fixtures";
import { bytes, compact, ms, pct } from "./board/format";

/*
 * Traffic overview: what is happening right now. A deterministic 2-second
 * tick walks precomputed per-second sequences, so readings change and flip
 * into place like a live board. Pause stops the tick.
 * Sample data only; getTrafficBoard() is the seam a live stream replaces.
 */

const LEN = 240; // precomputed seconds; the tick wraps around
const WINDOW = 60;

function getTrafficBoard() {
  const routes = ENDPOINTS.map((e) => {
    const base = e.requests / 86_400;
    return {
      e,
      rps: series(`rt-${e.id}`, LEN, base, base * 0.4, { diurnal: false, floor: 0 }),
      err: series(`rt-err-${e.id}`, LEN, e.errorRate, e.errorRate * 0.6, { diurnal: false, floor: 0 }),
      p95: series(`rt-p95-${e.id}`, LEN, e.p95, e.p95 * 0.3, { diurnal: false, floor: 1 }),
    };
  });
  const total = Array.from({ length: LEN }, (_, i) => Math.round(routes.reduce((a, r) => a + r.rps[i], 0)));
  const errors = Array.from({ length: LEN }, (_, i) => Math.round(routes.reduce((a, r) => a + (r.rps[i] * r.err[i]) / 100, 0) * 10) / 10);
  const clients = [
    { label: "acme-retail", value: 212 },
    { label: "northwind-prod", value: 164 },
    { label: "globex-eu", value: 118 },
    { label: "initech-mobile", value: 74 },
    { label: "umbrella-labs", value: 41 },
  ];
  return { routes, total, errors, clients };
}

type Route = ReturnType<typeof getTrafficBoard>["routes"][number];

function windowOf(arr: number[], tick: number, n = WINDOW) {
  return Array.from({ length: n }, (_, i) => arr[(tick - n + 1 + i + LEN * 4) % LEN]);
}

const secLabel = (i: number) => `${WINDOW - 1 - i}s ago`;

function routeState(e: Endpoint, err: number): State {
  if (e.state === "bad" || err >= 2) return "bad";
  if (e.state === "warn" || err >= 0.3) return "warn";
  return "ok";
}

function RouteDetail({ r, tick }: { r: Route; tick: number }) {
  return (
    <TimeChart
      label={`${r.e.method} ${r.e.path} requests per second over the last minute`}
      height={170}
      xLabels={["60s ago", "45s", "30s", "15s", "now"]}
      format={(v) => `${Math.round(v)}`}
      pointLabel={secLabel}
      series={[
        { label: "Req/s", color: "var(--text)", data: windowOf(r.rps, tick), area: true },
        { label: "P95 ms", color: "var(--blue)", data: windowOf(r.p95, tick).map((v) => v / 10), dashed: true },
      ]}
    />
  );
}

export default function RealtimeTraffic() {
  const { routes, total, errors, clients } = getTrafficBoard();
  const [tick, setTick] = useState(WINDOW);
  const [live, setLive] = useState(true);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 2000);
    return () => window.clearInterval(id);
  }, [live]);

  const at = (arr: number[]) => arr[tick % LEN];
  const rps = at(total);
  const errPerMin = Math.round(windowOf(errors, tick).reduce((a, v) => a + v, 0));
  const p95Now = Math.round(routes.reduce((a, r) => a + at(r.p95) * at(r.rps), 0) / Math.max(1, rps));
  const status = { s2: rps * 0.912, s3: rps * 0.021, s4: rps * 0.058, s5: rps * 0.009 };

  const verdict: VerdictItem[] = [
    { state: "bad", text: "POST /v1/alerts/dispatch failing 1 in 26 requests" },
    { state: "warn", text: `${errPerMin} failed requests in the last minute` },
  ];

  return (
    <BoardPage
      title="Traffic overview"
      description="Requests as they arrive. Values update every two seconds; pause to read them."
      verdict={verdict}
      window="Last 60 seconds"
      actions={
        <BoardButton onClick={() => setLive((v) => !v)} title={live ? "Pause live updates" : "Resume live updates"}>
          <span className="inline-flex items-center gap-1.5">
            {live ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
            {live ? "Pause" : "Resume"}
          </span>
        </BoardButton>
      }
    >
      <Readouts
        items={[
          { label: "Requests per second", value: compact(rps), note: live ? "live" : "paused" },
          { label: "In flight", value: String(Math.round(rps * 0.11)), note: "open connections" },
          { label: "Failed per minute", value: String(errPerMin), note: "5xx, last 60s", state: errPerMin > 60 ? "bad" : errPerMin > 20 ? "warn" : undefined },
          { label: "P95, last minute", value: ms(p95Now), note: "request-weighted" },
          { label: "Active clients", value: String(38 + (tick % 7)), note: "distinct API keys" },
          { label: "Bandwidth out", value: `${bytes(rps * 48_000)}/s`, note: "egress" },
        ]}
      />

      <Ledger
        id="route"
        title="Routes now"
        meta="Worst first, last minute"
        rows={routes}
        rowId={(r) => r.e.id}
        rowState={(r) => routeState(r.e, at(r.err))}
        attention={(r) => at(r.rps)}
        primary={{
          header: "Route",
          cell: (r) => (
            <span className="font-mono">
              <span className="mr-2 text-[11px] text-[var(--text3)]">{r.e.method}</span>
              {r.e.path}
            </span>
          ),
          sub: (r) => r.e.service,
        }}
        columns={[
          { key: "trend", header: "Last 60s", hide: "lg", cell: (r) => <Trend data={windowOf(r.rps, tick, 30)} state={routeState(r.e, at(r.err))} label={`${r.e.path} requests per second`} /> },
          { key: "rps", header: "Req/s", align: "right", sortValue: (r) => at(r.rps), cell: (r) => <span className="text-[var(--text)]">{Math.round(at(r.rps))}</span> },
          { key: "p95", header: "P95", align: "right", sortValue: (r) => at(r.p95), cell: (r) => ms(at(r.p95)) },
          {
            key: "err",
            header: "Errors",
            align: "right",
            sortValue: (r) => at(r.err),
            cell: (r) => <span style={{ color: stateText(routeState(r.e, at(r.err))) }}>{pct(at(r.err))}</span>,
          },
        ]}
        detail={(r) => <RouteDetail r={r} tick={tick} />}
      />

      <Panel title="Last 60 seconds" meta="All routes, per second">
        <TimeChart
          label="Requests and failed requests per second over the last minute"
          xLabels={["60s ago", "45s", "30s", "15s", "now"]}
          format={(v) => compact(v)}
          pointLabel={secLabel}
          series={[
            { label: "Req/s", color: "var(--text)", data: windowOf(total, tick), area: true },
            { label: "Failed/s ×10", color: "var(--red)", data: windowOf(errors, tick).map((v) => v * 10) },
          ]}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Status mix" meta="Share of responses, now">
          <SplitBar
            label="Responses by status class right now"
            format={(v) => `${Math.round(v)}/s`}
            segments={[
              { label: "2xx", value: status.s2, color: "var(--border2)" },
              { label: "3xx", value: status.s3, color: "var(--text3)" },
              { label: "4xx", value: status.s4, color: "var(--amber)", state: "warn" },
              { label: "5xx", value: status.s5, color: "var(--red)", state: "bad" },
            ]}
          />
        </Panel>
        <Panel title="Busiest clients" meta="Requests per second by API key">
          <RankList
            label="API keys ranked by requests per second"
            format={(v) => `${v}/s`}
            items={clients.map((c, i) => ({ ...c, value: c.value + ((tick + i * 3) % 9) - 4, state: c.label === "acme-retail" ? "warn" : undefined, sub: c.label === "acme-retail" ? "90% of limit" : undefined }))}
          />
        </Panel>
      </div>
    </BoardPage>
  );
}
