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
  Tag,
  TimeChart,
  stateText,
  type State,
  type VerdictItem,
} from "./board/kit";
import { DAYS_30, ERROR_GROUPS, RELEASES, SERVICES, fleetTotals, series, type Service } from "./board/fixtures";
import { compact, money, pct } from "./board/format";

/*
 * Executive overview: are we keeping our reliability promises, and what does
 * it cost when we don't. Lead ledger is SLOs ranked by error-budget burn.
 * Sample data only; getExecutiveBoard() is the seam a live API replaces.
 */

interface Slo {
  service: Service;
  objective: number;
  budgetLeft: number; // % of 30-day budget remaining
  burn: number; // × sustainable rate
  customerFacing: boolean;
  burnSeries: number[]; // cumulative budget consumed %, 30 days
  state: State;
}

function getExecutiveBoard() {
  const totals = fleetTotals();
  const slos: Slo[] = SERVICES.map((s) => {
    const objective = s.id === "auth-service" || s.id === "billing-api" ? 99.95 : 99.9;
    const allowed = 100 - objective;
    const spent = Math.max(0, 100 - s.availability);
    const burn = Math.round((spent / allowed) * 10) / 10;
    const budgetLeft = Math.max(0, Math.round(100 - Math.min(100, burn * 38)));
    const state: State = burn > 2 || budgetLeft < 20 ? "bad" : burn > 1 || budgetLeft < 50 ? "warn" : "ok";
    const daily = series(`${s.id}-burn`, 30, (100 - budgetLeft) / 30, (100 - budgetLeft) / 45, { diurnal: false, spikeAt: state === "bad" ? 29 : undefined, spike: 12 });
    const burnSeries = daily.reduce<number[]>((acc, v) => [...acc, Math.min(100, (acc[acc.length - 1] ?? 0) + v)], []);
    return { service: s, objective, budgetLeft, burn, customerFacing: s.id !== "search-indexer" && s.id !== "trace-collector", burnSeries, state };
  });
  const atRisk = slos.filter((s) => s.state !== "ok");
  const budgetLeft = Math.round(slos.reduce((a, s) => a + s.budgetLeft, 0) / slos.length);
  const impact = [...ERROR_GROUPS].sort((a, b) => b.users - a.users).slice(0, 6);
  const today = RELEASES.filter((r) => r.deployedAt.startsWith("Today"));
  return { totals, slos, atRisk, budgetLeft, impact, today };
}

const dayLabel = (i: number) => `Day ${i + 1} of 30`;

function SloDetail({ slo }: { slo: Slo }) {
  const s = slo.service;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <Facts
          items={[
            { label: "Objective", value: `${slo.objective}%` },
            { label: "Current, 30d", value: `${s.availability.toFixed(2)}%`, state: s.availability < slo.objective ? "bad" : undefined },
            { label: "Budget left", value: `${slo.budgetLeft}%`, state: slo.state === "ok" ? undefined : slo.state },
            { label: "Owner", value: s.team },
          ]}
        />
        <div className="mt-5">
          <TimeChart
            label={`${s.id} error budget consumed over 30 days`}
            height={180}
            xLabels={DAYS_30}
            max={100}
            format={(v) => `${Math.round(v)}%`}
            pointLabel={dayLabel}
            threshold={{ value: 100, label: "budget exhausted", state: "bad" }}
            series={[{ label: "Budget consumed", color: slo.state === "bad" ? "var(--red)" : "var(--text)", data: slo.burnSeries, area: true }]}
          />
        </div>
      </div>
      {slo.state !== "ok" ? (
        <ModelNote
          title={slo.state === "bad" ? "Budget runs out in about 3 days at this rate" : "Burn is above the sustainable rate"}
          confidence={slo.state === "bad" ? 91 : 74}
          action={
            <AiActionButton onClick={() => toast("Draft freeze notice prepared (sample)")}>
              {slo.state === "bad" ? "Propose deploy freeze" : "Notify owner"}
            </AiActionButton>
          }
        >
          {s.id} is burning its budget at {slo.burn}× the sustainable rate.{" "}
          {s.note ? `${s.note}.` : "Most of the spend is from latency above target."}
        </ModelNote>
      ) : (
        <p className="rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-3.5 text-[13px] leading-[1.6] text-[var(--text2)]">
          On track. At the current rate {slo.budgetLeft}% of the budget remains at the end of the window.
        </p>
      )}
    </div>
  );
}

export default function ExecutiveCommandCenter() {
  const { totals, slos, atRisk, budgetLeft, impact, today } = getExecutiveBoard();
  const failing = slos.filter((s) => s.state === "bad").length;

  const verdict: VerdictItem[] = [
    ...(failing ? [{ state: "bad" as const, text: `${failing} SLO will breach this month` }] : []),
    ...(atRisk.length - failing ? [{ state: "warn" as const, text: `${atRisk.length - failing} burning too fast` }] : []),
    { state: "ok", text: `${slos.length - atRisk.length} on track` },
  ];

  return (
    <BoardPage
      title="Executive overview"
      description="Reliability against the promises we make to customers, and what falling short costs."
      verdict={verdict}
      window="Last 30 days"
    >
      <Readouts
        items={[
          { label: "Availability", value: pct(totals.availability), delta: "−0.03%", verdict: "bad", note: "target 99.95%", state: totals.availability < 99.95 ? "warn" : undefined },
          { label: "Error budget left", value: `${budgetLeft}%`, delta: "−21 pts", verdict: "bad", note: "fleet average" },
          { label: "Open incidents", value: "1", note: "INC-2291, sev 2", state: "bad" },
          { label: "Time to resolve", value: "38m", delta: "−12m", verdict: "good", note: "median, 7 days" },
          { label: "Revenue at risk", value: money(4845), delta: "17", verdict: "bad", note: "failed payments", state: "warn" },
          { label: "Requests", value: compact(totals.requests * 30), delta: "+9.1%", verdict: "flat", note: "vs prior 30 days" },
        ]}
      />

      <Ledger
        id="slo"
        title="Service level objectives"
        meta="Ranked by budget burn"
        rows={slos}
        rowId={(s) => s.service.id}
        rowState={(s) => s.state}
        attention={(s) => s.burn}
        primary={{
          header: "Service",
          cell: (s) => <span className="font-mono">{s.service.id}</span>,
          sub: (s) => `${s.service.team}${s.customerFacing ? " · customer facing" : " · internal"}`,
        }}
        columns={[
          { key: "obj", header: "Objective", align: "right", hide: "md", cell: (s) => `${s.objective}%` },
          {
            key: "cur",
            header: "Current",
            align: "right",
            sortValue: (s) => s.service.availability,
            cell: (s) => <span style={{ color: stateText(s.service.availability < s.objective ? "bad" : "ok") }}>{s.service.availability.toFixed(2)}%</span>,
          },
          {
            key: "budget",
            header: "Budget left",
            align: "right",
            sortValue: (s) => s.budgetLeft,
            className: "w-[170px]",
            cell: (s) => (
              <span className="flex items-center justify-end gap-3">
                <Meter value={s.budgetLeft} max={100} threshold={20} state={s.state} className="w-16" label={`${s.budgetLeft}% of budget left`} />
                <span className="w-10" style={{ color: stateText(s.state) }}>{s.budgetLeft}%</span>
              </span>
            ),
          },
          {
            key: "burn",
            header: "Burn rate",
            align: "right",
            sortValue: (s) => s.burn,
            cell: (s) => <span style={{ color: stateText(s.burn > 2 ? "bad" : s.burn > 1 ? "warn" : "ok") }}>{s.burn.toFixed(1)}×</span>,
          },
        ]}
        detail={(s) => <SloDetail slo={s} />}
      />

      <Panel title="Error budget consumed" meta="Services at risk, cumulative">
        <TimeChart
          label="Cumulative error budget consumed over 30 days for services at risk"
          xLabels={DAYS_30}
          max={100}
          format={(v) => `${Math.round(v)}%`}
          pointLabel={dayLabel}
          threshold={{ value: 100, label: "exhausted", state: "bad" }}
          series={atRisk.slice(0, 4).map((s, i) => ({
            label: s.service.id,
            color: s.state === "bad" ? "var(--red)" : (["var(--text)", "var(--blue)", "var(--violet)"][i % 3] as string),
            data: s.burnSeries,
          }))}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Ledger
          id="release"
          title="Deploys today"
          meta="Verdict from before and after error rate"
          filter={false}
          ranked={false}
          rows={today}
          rowId={(r) => `${r.service}-${r.id}`}
          rowState={(r) => r.state}
          primary={{ header: "Release", cell: (r) => <span className="font-mono">{r.service} {r.id}</span>, sub: (r) => `${r.deployedAt} · ${r.author}` }}
          columns={[
            {
              key: "err",
              header: "Error rate",
              align: "right",
              cell: (r) => (
                <span>
                  <span className="text-[var(--text3)]">{pct(r.errorBefore)} → </span>
                  <span style={{ color: stateText(r.state) }}>{pct(r.errorAfter)}</span>
                </span>
              ),
            },
            { key: "v", header: "Verdict", align: "right", className: "font-sans", cell: (r) => <Tag state={r.state}>{r.verdict}</Tag> },
          ]}
        />
        <Panel title="Issues reaching the most customers" meta="Affected users, 24h">
          <RankList
            label="Error groups ranked by affected users"
            format={(v) => v.toLocaleString("en-US")}
            items={impact.map((e) => ({ label: e.name, sub: e.service, value: e.users, state: e.state === "ok" ? undefined : e.state }))}
          />
        </Panel>
      </div>
    </BoardPage>
  );
}
