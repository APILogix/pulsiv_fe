import { toast } from "sonner";
import { AiActionButton } from "@/shared/ui/sentinel";
import {
  BoardPage,
  Columns,
  Facts,
  Ledger,
  Meter,
  ModelNote,
  Panel,
  Readouts,
  TimeChart,
  Timeline,
  Trend,
  stateText,
  type VerdictItem,
} from "@/pages/dashboards/board/kit";
import { ACTIVITY, ENDPOINTS, HOURS_24, SERVICES, fleetTotals, type Service } from "@/pages/dashboards/board/fixtures";
import { compact, ms, pct } from "@/pages/dashboards/board/format";

/*
 * Home: the org's departure board. Verdict, one readout strip, then every
 * service ranked worst first with its evidence unfolding in place.
 * Sample data only; getHomeBoard() is the seam a live API replaces.
 */

function getHomeBoard() {
  const totals = fleetTotals();
  const bad = SERVICES.filter((s) => s.state === "bad").length;
  const warn = SERVICES.filter((s) => s.state === "warn").length;
  const ok = SERVICES.length - bad - warn;
  const p95 = Math.round(SERVICES.reduce((a, s) => a + s.p95 * s.requests, 0) / totals.requests);
  const buckets = Array.from({ length: 6 }, (_, b) => {
    const slice = (arr: number[]) => arr.slice(b * 4, b * 4 + 4).reduce((a, v) => a + v, 0);
    const req = slice(totals.traffic);
    const s5 = slice(totals.errors);
    return { label: HOURS_24[b], values: { s2: Math.round(req * 0.93), s4: Math.round(req * 0.06), s5 } };
  });
  return { totals, bad, warn, ok, p95, buckets };
}

const hourLabel = (i: number) => `${String(i).padStart(2, "0")}:00`;

function ServiceDetail({ s }: { s: Service }) {
  const ratio = s.p95 / s.p95Base;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <Facts
          items={[
            { label: "Owner", value: s.team },
            { label: "Region", value: s.region },
            { label: "P95 vs baseline", value: `${ratio.toFixed(1)}×`, state: ratio > 2 ? "bad" : ratio > 1.25 ? "warn" : undefined },
            { label: "Apdex", value: s.apdex.toFixed(2), state: s.apdex < 0.8 ? "bad" : s.apdex < 0.9 ? "warn" : undefined },
          ]}
        />
        <div className="mt-5">
          <TimeChart
            label={`${s.id} p95 latency over the last 24 hours`}
            height={180}
            xLabels={HOURS_24}
            format={(v) => `${Math.round(v)}`}
            pointLabel={hourLabel}
            threshold={{ value: s.p95Base, label: `baseline ${s.p95Base}ms` }}
            series={[{ label: "P95 ms", color: s.state === "bad" ? "var(--red)" : "var(--text)", data: s.latency }]}
          />
        </div>
      </div>
      {s.note ? (
        <ModelNote
          title={s.state === "bad" ? "Queue backpressure, not a code regression" : "Drift started with the last deploy"}
          confidence={s.state === "bad" ? 94 : 78}
          action={
            <AiActionButton onClick={() => toast("Suggested runbook opened (sample)")}>
              {s.state === "bad" ? "Scale consumers" : "Compare releases"}
            </AiActionButton>
          }
        >
          {s.note}. P95 is {ratio.toFixed(1)}× its 30-day baseline of {s.p95Base}ms.
        </ModelNote>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-3.5 text-[13px] leading-[1.6] text-[var(--text2)]">
          Within baseline for the whole window. Latest release {s.version} has been live without new error groups.
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { totals, bad, warn, ok, p95, buckets } = getHomeBoard();

  const verdict: VerdictItem[] = [
    ...(bad ? [{ state: "bad" as const, text: `${bad} service failing` }] : []),
    ...(warn ? [{ state: "warn" as const, text: `${warn} degraded` }] : []),
    { state: "ok", text: `${ok} healthy` },
  ];

  return (
    <BoardPage
      padded
      title="Home"
      description="Every connected service across the organization, worst first. Open a row to see why."
      verdict={verdict}
    >
      <Readouts
        items={[
          { label: "Requests", value: compact(totals.requests), delta: "+12.4%", verdict: "flat", note: "vs previous 24h" },
          { label: "Error rate", value: pct(totals.errorRate), delta: "+0.09%", verdict: "bad", note: "vs previous 24h", state: totals.errorRate > 0.25 ? "warn" : undefined },
          { label: "P95 latency", value: ms(p95), delta: "+18ms", verdict: "bad", note: "request-weighted" },
          { label: "Availability", value: pct(totals.availability, 2), delta: "−0.03%", verdict: "bad", note: "SLO 99.90%" },
          { label: "Open incidents", value: "1", note: "INC-2291 · paged", state: "bad" },
        ]}
      />

      <Ledger
        id="service"
        title="Services"
        rows={SERVICES}
        rowId={(s) => s.id}
        rowState={(s) => s.state}
        attention={(s) => s.errorRate}
        primary={{ header: "Service", cell: (s) => <span className="font-mono">{s.id}</span>, sub: (s) => s.note ?? `${s.team} · ${s.version}` }}
        columns={[
          { key: "traffic", header: "Traffic, 24h", hide: "lg", cell: (s) => <Trend data={s.traffic} label={`${s.id} requests per hour`} /> },
          { key: "req", header: "Requests", align: "right", sortValue: (s) => s.requests, cell: (s) => <span className="text-[var(--text)]">{compact(s.requests)}</span> },
          {
            key: "p95",
            header: "P95",
            align: "right",
            sortValue: (s) => s.p95,
            cell: (s) => <span style={{ color: stateText(s.p95 > s.p95Base * 2 ? "bad" : s.p95 > s.p95Base * 1.25 ? "warn" : "ok") }}>{ms(s.p95)}</span>,
          },
          {
            key: "err",
            header: "Error rate",
            align: "right",
            sortValue: (s) => s.errorRate,
            cell: (s) => <span style={{ color: stateText(s.errorRate >= 1 ? "bad" : s.errorRate >= 0.3 ? "warn" : "ok") }}>{pct(s.errorRate)}</span>,
          },
          {
            key: "avail",
            header: "Availability",
            align: "right",
            hide: "md",
            sortValue: (s) => s.availability,
            className: "w-[150px]",
            cell: (s) => (
              <span className="flex items-center justify-end gap-3">
                <Meter value={s.availability - 97} max={3} threshold={2.9} state={s.availability < 99.9 ? "bad" : "ok"} className="w-14" />
                <span style={{ color: stateText(s.availability < 99.9 ? "bad" : "ok") }}>{s.availability.toFixed(2)}%</span>
              </span>
            ),
          },
        ]}
        detail={(s) => <ServiceDetail s={s} />}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Traffic and errors" meta="All services, hourly">
          <TimeChart
            label="Requests and failed requests per hour over the last 24 hours"
            xLabels={HOURS_24}
            format={compact}
            pointLabel={hourLabel}
            series={[
              { label: "Requests", color: "var(--text)", data: totals.traffic, area: true },
              { label: "Failed", color: "var(--red)", data: totals.errors },
            ]}
          />
        </Panel>
        <Panel title="Recent activity" meta="Today" flush>
          <Timeline items={ACTIVITY} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Responses by status class" meta="4-hour buckets">
          <Columns
            label="Responses by status class in four-hour buckets"
            format={compact}
            buckets={buckets}
            keys={[
              { key: "s2", label: "2xx", color: "var(--border2)" },
              { key: "s4", label: "4xx", color: "var(--amber)" },
              { key: "s5", label: "5xx", color: "var(--red)" },
            ]}
          />
        </Panel>
        <Ledger
          id="endpoint"
          title="Busiest endpoints"
          meta="Worst first"
          filter={false}
          limit={5}
          rows={ENDPOINTS}
          rowId={(e) => e.id}
          rowState={(e) => e.state}
          attention={(e) => e.requests}
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
            { key: "req", header: "Requests", align: "right", sortValue: (e) => e.requests, cell: (e) => <span className="text-[var(--text)]">{compact(e.requests)}</span> },
            { key: "p95", header: "P95", align: "right", sortValue: (e) => e.p95, cell: (e) => ms(e.p95) },
            {
              key: "err",
              header: "Errors",
              align: "right",
              sortValue: (e) => e.errorRate,
              cell: (e) => <span style={{ color: stateText(e.state) }}>{pct(e.errorRate)}</span>,
            },
          ]}
        />
      </div>
    </BoardPage>
  );
}
