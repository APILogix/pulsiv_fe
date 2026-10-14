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
  SplitBar,
  TimeChart,
  Trend,
  stateText,
  type State,
  type VerdictItem,
} from "./board/kit";
import { DAYS_30, series } from "./board/fixtures";
import { compact, money, pct } from "./board/format";

/*
 * Business metrics: how customers use the API. Lead ledger is tenants ranked
 * by churn risk (usage falling, errors rising), so product and account teams
 * see who to call before revenue moves.
 * Sample data only; getBusinessBoard() is the seam a live API replaces.
 */

interface Tenant {
  id: string;
  plan: "Enterprise" | "Growth" | "Starter";
  mrr: number;
  calls: number; // 30d
  change: number; // % vs prior 30d
  errorRate: number;
  sdk: string;
  lastActive: string;
  usage: number[];
  state: State;
}

function t(id: string, plan: Tenant["plan"], mrr: number, calls: number, change: number, errorRate: number, sdk: string, lastActive: string): Tenant {
  const state: State = change <= -30 || errorRate >= 2 ? "bad" : change <= -10 || errorRate >= 0.8 ? "warn" : "ok";
  const trend = change / 100;
  const base = calls / 30;
  const usage = series(`biz-${id}`, 30, base, base * 0.25, { diurnal: false, floor: 0 }).map((v, i) => Math.round(v * (1 + trend * (i / 29 - 0.5))));
  return { id, plan, mrr, calls, change, errorRate, sdk, lastActive, usage, state };
}

const TENANTS: Tenant[] = [
  t("acme-retail", "Enterprise", 18_400, 412_000_000, 21, 0.31, "server 4.12", "now"),
  t("northwind-prod", "Enterprise", 14_200, 288_000_000, -34, 2.6, "server 4.9", "2m ago"),
  t("globex-eu", "Enterprise", 11_900, 201_000_000, 6, 0.18, "server 4.12", "now"),
  t("initech-mobile", "Growth", 4_800, 96_000_000, -18, 0.94, "ios 3.2", "14m ago"),
  t("umbrella-labs", "Growth", 3_900, 71_000_000, 12, 0.22, "web 5.0", "now"),
  t("hooli-data", "Growth", 3_200, 58_000_000, -12, 0.41, "server 4.3", "3h ago"),
  t("stark-ops", "Starter", 490, 8_400_000, 44, 0.12, "web 5.0", "now"),
  t("wayne-pay", "Enterprise", 9_600, 164_000_000, 2, 0.84, "server 4.12", "now"),
];

function getBusinessBoard() {
  const mrr = TENANTS.reduce((a, x) => a + x.mrr, 0);
  const activeTenants = series("biz-active", 30, 2_300, 60, { diurnal: false }).map((v, i) => Math.round(v + i * 4));
  const newTenants = series("biz-new", 30, 11, 6, { diurnal: false, floor: 0 });
  const versions = [
    { label: "4.12 (latest)", value: 58, color: "var(--text)" },
    { label: "4.9", value: 23, color: "var(--blue)" },
    { label: "4.3", value: 12, color: "var(--violet)" },
    { label: "3.x (unsupported)", value: 7, color: "var(--amber)", state: "warn" as State },
  ];
  const activation = [
    { label: "Week 1", values: { active: 412, idle: 88 } },
    { label: "Week 2", values: { active: 398, idle: 96 } },
    { label: "Week 3", values: { active: 440, idle: 71 } },
    { label: "Week 4", values: { active: 461, idle: 64 } },
  ];
  const features = [
    { label: "Error groups", value: 94 },
    { label: "Alert rules", value: 81 },
    { label: "Traces", value: 67 },
    { label: "Automation workflows", value: 38 },
    { label: "Model insights", value: 29 },
  ];
  return { mrr, activeTenants, newTenants, versions, activation, features };
}

function TenantDetail({ x }: { x: Tenant }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <Facts
          items={[
            { label: "Plan", value: x.plan },
            { label: "Monthly revenue", value: money(x.mrr) },
            { label: "SDK", value: x.sdk, state: x.sdk.endsWith("4.3") || x.sdk.endsWith("4.9") ? "warn" : undefined },
            { label: "Error rate", value: pct(x.errorRate), state: x.errorRate >= 2 ? "bad" : x.errorRate >= 0.8 ? "warn" : undefined },
          ]}
        />
        <div className="mt-5">
          <TimeChart
            label={`${x.id} API calls per day over 30 days`}
            height={170}
            xLabels={DAYS_30}
            format={compact}
            pointLabel={(i) => `Day ${i + 1} of 30`}
            series={[{ label: "Calls per day", color: x.state === "bad" ? "var(--red)" : "var(--text)", data: x.usage, area: true }]}
          />
        </div>
      </div>
      {x.state !== "ok" ? (
        <ModelNote
          title={x.state === "bad" ? "Usage dropped after errors rose" : "Usage is drifting down"}
          confidence={x.state === "bad" ? 84 : 66}
          action={<AiActionButton onClick={() => toast(`Account summary for ${x.id} drafted (sample)`)}>Brief the account owner</AiActionButton>}
        >
          {x.state === "bad"
            ? `${x.id} started seeing ${pct(x.errorRate)} errors on POST /v1/alerts/dispatch on Sep 29 and cut calls ${Math.abs(x.change)}% the same week. ${money(x.mrr)} a month is at risk.`
            : `Calls are ${Math.abs(x.change)}% below the prior 30 days with no error change. Often a sign of a migration or a paused project.`}
        </ModelNote>
      ) : (
        <p className="rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-3.5 text-[13px] leading-[1.6] text-[var(--text2)]">
          Growing or steady usage and a healthy error rate. No action needed.
        </p>
      )}
    </div>
  );
}

export default function BusinessMetrics() {
  const { mrr, activeTenants, newTenants, versions, activation, features } = getBusinessBoard();
  const atRisk = TENANTS.filter((x) => x.state !== "ok");
  const mrrAtRisk = atRisk.reduce((a, x) => a + x.mrr, 0);

  const verdict: VerdictItem[] = [
    { state: "bad", text: `${money(mrrAtRisk)} monthly revenue in at-risk accounts` },
    { state: "warn", text: `${atRisk.length} tenants with falling usage` },
    { state: "ok", text: "Active tenants up 5.2% this month" },
  ];

  return (
    <BoardPage
      title="Business metrics"
      description="API adoption, retention and revenue, with the accounts most likely to churn at the top."
      verdict={verdict}
      window="Last 30 days"
    >
      <Readouts
        items={[
          { label: "Active tenants", value: activeTenants[29].toLocaleString("en-US"), delta: "+5.2%", verdict: "good" },
          { label: "New tenants", value: String(newTenants.reduce((a, v) => a + Math.round(v), 0)), delta: "+18", verdict: "good", note: "this month" },
          { label: "API calls", value: compact(TENANTS.reduce((a, x) => a + x.calls, 0)), delta: "+9.1%", verdict: "good" },
          { label: "Tracked revenue", value: money(mrr), note: "per month, top tenants" },
          { label: "Revenue at risk", value: money(mrrAtRisk), note: `${atRisk.length} accounts`, state: "bad" },
          { label: "Net retention", value: "112%", delta: "−3 pts", verdict: "bad", note: "trailing 12 months" },
        ]}
      />

      <Ledger
        id="tenant"
        title="Tenants"
        meta="Churn risk first"
        rows={TENANTS}
        rowId={(x) => x.id}
        rowState={(x) => x.state}
        attention={(x) => x.mrr}
        primary={{ header: "Tenant", cell: (x) => <span className="font-mono">{x.id}</span>, sub: (x) => `${x.plan} · last active ${x.lastActive}` }}
        columns={[
          { key: "trend", header: "Calls, 30d", hide: "lg", cell: (x) => <Trend data={x.usage} state={x.state} label={`${x.id} calls per day`} /> },
          { key: "calls", header: "Calls", align: "right", hide: "sm", sortValue: (x) => x.calls, cell: (x) => compact(x.calls) },
          {
            key: "change",
            header: "Change",
            align: "right",
            sortValue: (x) => x.change,
            cell: (x) => <span style={{ color: x.change > 0 ? "var(--green)" : stateText(x.change <= -30 ? "bad" : x.change <= -10 ? "warn" : "ok") }}>{x.change > 0 ? "+" : "−"}{Math.abs(x.change)}%</span>,
          },
          { key: "err", header: "Errors", align: "right", hide: "md", sortValue: (x) => x.errorRate, cell: (x) => <span style={{ color: stateText(x.errorRate >= 2 ? "bad" : x.errorRate >= 0.8 ? "warn" : "ok") }}>{pct(x.errorRate)}</span> },
          { key: "mrr", header: "Revenue/mo", align: "right", sortValue: (x) => x.mrr, cell: (x) => <span className="text-[var(--text)]">{money(x.mrr)}</span> },
        ]}
        detail={(x) => <TenantDetail x={x} />}
      />

      <Panel title="Active tenants" meta="Daily, with new sign-ups">
        <TimeChart
          label="Active tenants and new tenants per day over 30 days"
          xLabels={DAYS_30}
          format={(v) => compact(v)}
          pointLabel={(i) => `Day ${i + 1} of 30`}
          series={[
            { label: "Active", color: "var(--text)", data: activeTenants, area: true },
            { label: "New ×100", color: "var(--blue)", data: newTenants.map((v) => v * 100), dashed: true },
          ]}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="SDK versions" meta="Share of tenants">
          <SplitBar label="Tenants by SDK version" format={(v) => `${v}%`} segments={versions} />
        </Panel>
        <Panel title="Activation" meta="Projects sending data in their first week">
          <Columns
            label="New projects active versus idle in their first week, by cohort"
            format={(v) => String(Math.round(v))}
            height={200}
            buckets={activation}
            keys={[
              { key: "active", label: "Active", color: "var(--text2)" },
              { key: "idle", label: "Idle", color: "var(--border2)" },
            ]}
          />
        </Panel>
        <Panel title="Feature adoption" meta="Share of active tenants">
          <ul className="flex flex-col" aria-label="Feature adoption by share of active tenants">
            {features.map((f) => (
              <li key={f.label} className="border-t border-[var(--border)] py-2.5 first:border-t-0">
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="text-[var(--text2)]">{f.label}</span>
                  <span className="font-mono text-[var(--text)]">{f.value}%</span>
                </div>
                <Meter value={f.value} max={100} className="mt-2" />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </BoardPage>
  );
}
