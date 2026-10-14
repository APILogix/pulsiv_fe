import { toast } from "sonner";
import { AiActionButton } from "@/shared/ui/sentinel";
import {
  BoardPage,
  Facts,
  Ledger,
  ModelNote,
  Panel,
  RankList,
  Readouts,
  SplitBar,
  TimeChart,
  stateText,
  type VerdictItem,
} from "./board/kit";
import { COUNTRIES, HOURS_24, series, type Country } from "./board/fixtures";
import { compact, ms, pct } from "./board/format";
import { WorldChoropleth } from "./WorldChoropleth";

/*
 * Geo analytics: where users are slow or failing. The map shows volume; the
 * country ledger beside it ranks by state and carries every number.
 * Sample data only; getGeoBoard() is the seam a live API replaces.
 */

const P95_TARGET = 300;

const NOTES: Record<string, string> = {
  IN: "Requests from India terminate at the bom edge but are proxied to us-east-1 for every write. Adding an ap-south-1 read replica would remove roughly 420ms from p95.",
  BR: "gru traffic falls back to iad when the São Paulo cache misses, which is 38% of requests since Sep 26.",
  AU: "syd is healthy; latency is the trans-Pacific hop to us-east-1 for POST /v1/ingest.",
};

function getGeoBoard() {
  const requests = COUNTRIES.reduce((a, c) => a + c.requests, 0);
  const users = COUNTRIES.reduce((a, c) => a + c.users, 0);
  const regions = ["Americas", "Europe", "Asia Pacific"].map((r) => ({
    region: r,
    requests: COUNTRIES.filter((c) => c.region === r).reduce((a, c) => a + c.requests, 0),
  }));
  const pops = COUNTRIES.map((c) => ({ pop: c.pop, p95: c.p95, state: c.state }));
  const curves = Object.fromEntries(
    COUNTRIES.map((c) => [c.code, series(`geo-${c.code}`, 24, c.p95 * 0.85, c.p95 * 0.35, { floor: 20 })]),
  ) as Record<string, number[]>;
  return { requests, users, regions, pops, curves };
}

const hourLabel = (i: number) => `${String(i).padStart(2, "0")}:00`;

function CountryDetail({ c, curve }: { c: Country; curve: number[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <Facts
          items={[
            { label: "Nearest edge", value: c.pop },
            { label: "Region", value: c.region },
            { label: "Users, 24h", value: c.users.toLocaleString("en-US") },
            { label: "P95 vs target", value: `${(c.p95 / P95_TARGET).toFixed(1)}×`, state: c.state === "ok" ? undefined : c.state },
          ]}
        />
        <div className="mt-5">
          <TimeChart
            label={`${c.name} p95 latency over 24 hours`}
            height={170}
            xLabels={HOURS_24}
            format={(v) => `${Math.round(v)}`}
            pointLabel={hourLabel}
            threshold={{ value: P95_TARGET, label: "target 300ms", state: "warn" }}
            series={[{ label: "P95 ms", color: c.state === "bad" ? "var(--red)" : "var(--text)", data: curve }]}
          />
        </div>
      </div>
      {NOTES[c.code] ? (
        <ModelNote
          title={c.state === "bad" ? "Writes cross an ocean" : "Latency is distance, not load"}
          confidence={c.state === "bad" ? 86 : 68}
          action={c.state === "bad" ? <AiActionButton onClick={() => toast("Replica plan drafted (sample)")}>Plan a replica</AiActionButton> : undefined}
        >
          {NOTES[c.code]}
        </ModelNote>
      ) : (
        <p className="rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-3.5 text-[13px] leading-[1.6] text-[var(--text2)]">
          Served from {c.pop} within target all day.
        </p>
      )}
    </div>
  );
}

export default function GeoAnalytics() {
  const { requests, users, regions, pops, curves } = getGeoBoard();
  const bad = COUNTRIES.filter((c) => c.state === "bad");
  const warn = COUNTRIES.filter((c) => c.state === "warn");
  const slowest = [...COUNTRIES].sort((a, b) => b.p95 - a.p95)[0];
  const worstErr = [...COUNTRIES].sort((a, b) => b.errorRate - a.errorRate)[0];

  const verdict: VerdictItem[] = [
    ...bad.map((c) => ({ state: "bad" as const, text: `${c.name} at ${ms(c.p95)} p95` })),
    ...(warn.length ? [{ state: "warn" as const, text: `${warn.map((c) => c.name).join(" and ")} above target` }] : []),
    { state: "ok", text: `${COUNTRIES.length - bad.length - warn.length} countries within target` },
  ];

  return (
    <BoardPage title="Geo analytics" description="Where requests come from, and where users wait longest or fail most." verdict={verdict}>
      <Readouts
        items={[
          { label: "Countries served", value: String(COUNTRIES.length), note: "top 10 shown" },
          { label: "Requests", value: compact(requests), delta: "+8.2%", verdict: "flat" },
          { label: "Users", value: compact(users), delta: "+3.9%", verdict: "good" },
          { label: "Slowest country", value: ms(slowest.p95), note: `${slowest.name}, p95`, state: slowest.state },
          { label: "Worst error rate", value: pct(worstErr.errorRate), note: worstErr.name, state: worstErr.state },
          { label: "Edge locations", value: String(new Set(COUNTRIES.map((c) => c.pop)).size), note: "all reachable" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Request volume by country" meta="Share of requests, 24h">
          <WorldChoropleth data={COUNTRIES} format={compact} />
        </Panel>
        <Ledger
          id="country"
          title="Countries"
          filter={false}
          rows={COUNTRIES}
          rowId={(c) => c.code}
          rowState={(c) => c.state}
          attention={(c) => c.p95}
          primary={{
            header: "Country",
            cell: (c) => (
              <span>
                <span className="mr-2 font-mono text-[12px] text-[var(--text3)]">{c.code}</span>
                {c.name}
              </span>
            ),
            sub: (c) => `${c.region} · edge ${c.pop}`,
          }}
          columns={[
            { key: "req", header: "Requests", align: "right", sortValue: (c) => c.requests, cell: (c) => <span className="text-[var(--text)]">{compact(c.requests)}</span> },
            { key: "p95", header: "P95", align: "right", sortValue: (c) => c.p95, cell: (c) => <span style={{ color: stateText(c.state) }}>{ms(c.p95)}</span> },
            { key: "err", header: "Errors", align: "right", hide: "md", sortValue: (c) => c.errorRate, cell: (c) => pct(c.errorRate) },
          ]}
          detail={(c) => <CountryDetail c={c} curve={curves[c.code]} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="By region" meta="Requests, 24h">
          <SplitBar
            label="Requests by region"
            format={compact}
            segments={regions.map((r, i) => ({ label: r.region, value: r.requests, color: ["var(--text)", "var(--blue)", "var(--violet)"][i] }))}
          />
        </Panel>
        <Panel title="Edge locations" meta="P95 at the edge, slowest first">
          <RankList
            label="Edge locations ranked by p95 latency"
            format={ms}
            items={[...pops].sort((a, b) => b.p95 - a.p95).slice(0, 6).map((p) => ({ label: p.pop, value: p.p95, state: p.state === "ok" ? undefined : p.state }))}
          />
        </Panel>
        <Panel title="Clients" meta="Requests by SDK, 24h">
          <SplitBar
            label="Requests by client platform"
            format={compact}
            segments={[
              { label: "Server SDK", value: requests * 0.52, color: "var(--text)" },
              { label: "Web SDK", value: requests * 0.27, color: "var(--blue)" },
              { label: "iOS SDK", value: requests * 0.12, color: "var(--violet)" },
              { label: "Android SDK", value: requests * 0.09, color: "var(--text3)" },
            ]}
          />
        </Panel>
      </div>
    </BoardPage>
  );
}
