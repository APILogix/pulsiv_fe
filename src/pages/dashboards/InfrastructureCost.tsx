import { toast } from "sonner";
import { AiActionButton } from "@/shared/ui/sentinel";
import {
  BoardPage,
  Facts,
  Ledger,
  Meter,
  ModelNote,
  Panel,
  RankList,
  Readouts,
  SplitBar,
  TimeChart,
  stateText,
  type State,
  type VerdictItem,
} from "./board/kit";
import { DAYS_30, HOURS_24, series } from "./board/fixtures";
import { money } from "./board/format";

/*
 * Infrastructure overview: is capacity and spend healthy. Lead ledger ranks
 * nodes and pools by saturation; the model proposes rightsizing where a node
 * idles. Sample data only; getInfraBoard() is the seam a live API replaces.
 */

const CPU_LIMIT = 80;
const BUDGET = 48_000;

interface InfraNode {
  id: string;
  role: string;
  region: string;
  cpu: number;
  mem: number;
  disk: number;
  costDay: number;
  cpuSeries: number[];
  memSeries: number[];
  note?: string;
}

function n(id: string, role: string, region: string, cpu: number, mem: number, disk: number, costDay: number, note?: string): InfraNode {
  return {
    id, role, region, cpu, mem, disk, costDay, note,
    cpuSeries: series(`cpu-${id}`, 24, cpu * 0.85, cpu * 0.35, { floor: 1 }).map((v) => Math.min(100, v)),
    memSeries: series(`mem-${id}`, 24, mem, 6, { diurnal: false, floor: 1 }).map((v) => Math.min(100, v)),
  };
}

const NODES: InfraNode[] = [
  n("dispatch-worker-pool", "alert-dispatcher", "us-east-1", 94, 88, 41, 212, "Pool is pinned at its new max of 8 workers."),
  n("ingest-gw-a", "ingest-gateway", "us-east-1", 86, 71, 38, 184),
  n("pg-read-2", "postgres replica", "us-east-1", 78, 84, 81, 146),
  n("ingest-gw-b", "ingest-gateway", "us-east-1", 72, 66, 36, 184),
  n("query-engine-1", "query-engine", "us-east-1", 58, 62, 44, 164),
  n("trace-collector-eu", "trace-collector", "eu-west-1", 51, 48, 57, 128),
  n("postgres-primary", "postgres primary", "us-east-1", 46, 70, 64, 238),
  n("redis-cache-1", "redis", "us-east-1", 22, 61, 12, 74),
  n("search-indexer-2", "search-indexer", "eu-west-1", 9, 21, 33, 118, "Averaged 9% CPU for 14 days."),
  n("webhook-relay-ap", "webhook-relay", "ap-south-1", 14, 28, 18, 62),
];

const nodeState = (x: InfraNode): State => (x.cpu >= 90 || x.mem >= 90 || x.disk >= 90 ? "bad" : x.cpu >= CPU_LIMIT || x.mem >= 80 || x.disk >= 80 ? "warn" : "ok");

function getInfraBoard() {
  const daily = NODES.reduce((a, x) => a + x.costDay, 0);
  const spend = series("infra-spend", 30, daily * 1.02, daily * 0.12, { diurnal: false, spikeAt: 28, spike: daily * 0.18 });
  const runRate = Math.round(daily * 30);
  const idle = NODES.filter((x) => x.cpu < 20).reduce((a, x) => a + x.costDay * 30, 0);
  const byService = [
    { label: "ingest-gateway", value: 368 * 30 },
    { label: "postgres", value: (238 + 146) * 30 },
    { label: "alert-dispatcher", value: 212 * 30 },
    { label: "query-engine", value: 164 * 30 },
    { label: "Everything else", value: (128 + 74 + 118 + 62) * 30 },
  ];
  const pools = [
    { label: "pg-read-2 · query-engine", value: 92, state: "bad" as State, sub: "92 of 100" },
    { label: "postgres-primary · dispatcher", value: 64, state: "ok" as State, sub: "64 of 100" },
    { label: "postgres-primary · billing-api", value: 41, state: "ok" as State, sub: "41 of 100" },
    { label: "redis-cache-1 · auth-service", value: 28, state: "ok" as State, sub: "28 of 200" },
  ];
  return { daily, spend, runRate, idle, byService, pools };
}

const hourLabel = (i: number) => `${String(i).padStart(2, "0")}:00`;

function NodeDetail({ x }: { x: InfraNode }) {
  const state = nodeState(x);
  const idle = x.cpu < 20;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <Facts
          items={[
            { label: "Role", value: x.role },
            { label: "Region", value: x.region },
            { label: "Disk used", value: `${x.disk}%`, state: x.disk >= 80 ? "warn" : undefined },
            { label: "Cost per month", value: money(x.costDay * 30) },
          ]}
        />
        <div className="mt-5">
          <TimeChart
            label={`${x.id} CPU and memory over 24 hours`}
            height={170}
            xLabels={HOURS_24}
            max={100}
            format={(v) => `${Math.round(v)}%`}
            pointLabel={hourLabel}
            threshold={{ value: CPU_LIMIT, label: "80% limit", state: "warn" }}
            series={[
              { label: "CPU", color: state === "bad" ? "var(--red)" : "var(--text)", data: x.cpuSeries },
              { label: "Memory", color: "var(--blue)", data: x.memSeries },
            ]}
          />
        </div>
      </div>
      {state !== "ok" || idle ? (
        <ModelNote
          title={idle ? `Downsize to save ${money(x.costDay * 15)} a month` : "Scale out before the evening peak"}
          confidence={idle ? 82 : 87}
          action={
            <AiActionButton onClick={() => toast(idle ? "Rightsizing plan drafted (sample)" : "Scale-out change drafted (sample)")}>
              {idle ? "Draft rightsizing" : "Add capacity"}
            </AiActionButton>
          }
        >
          {idle
            ? `${x.note ?? ""} Moving it to half the instance size keeps peak CPU under 40%.`
            : `${x.note ?? `${x.id} crosses 80% CPU at the daily peak.`} Traffic peaks again at 16:00; another node keeps headroom above 25%.`}
        </ModelNote>
      ) : (
        <p className="rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-3.5 text-[13px] leading-[1.6] text-[var(--text2)]">
          Headroom above 20% on every resource through the daily peak.
        </p>
      )}
    </div>
  );
}

function usage(v: number, warnAt: number) {
  const s: State = v >= 90 ? "bad" : v >= warnAt ? "warn" : "ok";
  return (
    <span className="flex items-center justify-end gap-3">
      <Meter value={v} max={100} threshold={warnAt} state={s} className="w-14" />
      <span className="w-9" style={{ color: stateText(s) }}>{v}%</span>
    </span>
  );
}

export default function InfrastructureCost() {
  const { spend, runRate, idle, byService, pools } = getInfraBoard();
  const hot = NODES.filter((x) => nodeState(x) !== "ok");
  const cpuAvg = Math.round(NODES.reduce((a, x) => a + x.cpu, 0) / NODES.length);
  const memAvg = Math.round(NODES.reduce((a, x) => a + x.mem, 0) / NODES.length);

  const verdict: VerdictItem[] = [
    ...hot.filter((x) => nodeState(x) === "bad").map((x) => ({ state: "bad" as const, text: `${x.id} saturated` })),
    { state: "warn", text: `${hot.filter((x) => nodeState(x) === "warn").length} nodes above 80%` },
    runRate > BUDGET
      ? { state: "bad", text: "Spend over budget" }
      : { state: runRate > BUDGET * 0.95 ? "warn" : "ok", text: `Spend at ${Math.round((runRate / BUDGET) * 100)}% of budget` },
  ];

  return (
    <BoardPage title="Infrastructure overview" description="Capacity headroom per node and pool, and where the monthly spend goes." verdict={verdict}>
      <Readouts
        items={[
          { label: "Run rate", value: money(runRate), delta: "+4.2%", verdict: "bad", note: "per month" },
          { label: "Against budget", value: `${Math.round((runRate / BUDGET) * 100)}%`, note: `of ${money(BUDGET)}`, state: runRate > BUDGET ? "bad" : runRate > BUDGET * 0.95 ? "warn" : undefined },
          { label: "CPU, average", value: `${cpuAvg}%`, delta: "+7 pts", verdict: "bad" },
          { label: "Memory, average", value: `${memAvg}%`, delta: "+2 pts", verdict: "flat" },
          { label: "Nodes", value: String(NODES.length), note: `${hot.length} under pressure` },
          { label: "Idle spend", value: money(idle), note: "nodes under 20% CPU" },
        ]}
      />

      <Ledger
        id="node"
        title="Nodes and pools"
        meta="Most saturated first"
        rows={NODES}
        rowId={(x) => x.id}
        rowState={nodeState}
        attention={(x) => Math.max(x.cpu, x.mem, x.disk)}
        primary={{ header: "Node", cell: (x) => <span className="font-mono">{x.id}</span>, sub: (x) => `${x.role} · ${x.region}` }}
        columns={[
          { key: "cpu", header: "CPU", align: "right", className: "w-[130px]", sortValue: (x) => x.cpu, cell: (x) => usage(x.cpu, CPU_LIMIT) },
          { key: "mem", header: "Memory", align: "right", className: "w-[130px]", hide: "sm", sortValue: (x) => x.mem, cell: (x) => usage(x.mem, 80) },
          { key: "disk", header: "Disk", align: "right", className: "w-[130px]", hide: "lg", sortValue: (x) => x.disk, cell: (x) => usage(x.disk, 80) },
          { key: "cost", header: "Cost/day", align: "right", hide: "md", sortValue: (x) => x.costDay, cell: (x) => money(x.costDay) },
        ]}
        detail={(x) => <NodeDetail x={x} />}
      />

      <Panel title="Spend" meta="Daily, last 30 days">
        <TimeChart
          label="Daily infrastructure spend over 30 days against the daily budget"
          xLabels={DAYS_30}
          format={(v) => money(v)}
          pointLabel={(i) => `Day ${i + 1} of 30`}
          threshold={{ value: BUDGET / 30, label: `budget ${money(BUDGET / 30)}/day`, state: "warn" }}
          series={[{ label: "Spend", color: "var(--text)", data: spend, area: true }]}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Cost by service" meta="Per month">
          <SplitBar
            label="Monthly cost by service"
            format={money}
            segments={byService.map((s, i) => ({ ...s, color: ["var(--text)", "var(--blue)", "var(--violet)", "var(--text3)", "var(--border2)"][i] }))}
          />
        </Panel>
        <Panel title="Database connection pools" meta="Connections in use">
          <RankList
            label="Database connection pools ranked by connections in use"
            format={(v) => `${v}`}
            items={pools.map((p) => ({ ...p, state: p.state === "ok" ? undefined : p.state }))}
          />
        </Panel>
      </div>
    </BoardPage>
  );
}
