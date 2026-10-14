import { Link, useParams } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { orgRoutes } from "@/app/router/org-routes";
import { BoardPage, Ledger, Panel, Readouts, Timeline, type State, type VerdictItem } from "./board/kit";
import { ACTIVITY, COUNTRIES, ENDPOINTS, ERROR_GROUPS, RELEASES, SERVICES, fleetTotals } from "./board/fixtures";
import { compact, ms, pct } from "./board/format";

/*
 * Dashboards: the concourse board. One row per dashboard, lit by the state of
 * the data it watches, so the reader knows which board to open first.
 * Sample data only; getOverviewBoard() is the seam a live API replaces.
 */

interface BoardRow {
  sub: string;
  name: string;
  question: string;
  reading: string;
  audience: string;
  state: State;
  why: string;
}

function getOverviewBoard() {
  const totals = fleetTotals();
  const worstSvc = SERVICES.find((s) => s.state === "bad");
  const worstEp = [...ENDPOINTS].sort((a, b) => b.p99 - a.p99)[0];
  const newIssues = ERROR_GROUPS.filter((e) => e.status === "New" || e.status === "Regressed");
  const slowCountry = [...COUNTRIES].sort((a, b) => b.p95 - a.p95)[0];
  const badRelease = RELEASES.find((r) => r.state === "bad");

  const rows: BoardRow[] = [
    { sub: "executive", name: "Executive overview", question: "Are we meeting our reliability promises?", reading: `Availability ${pct(totals.availability)}`, audience: "Leadership", state: "warn", why: "Fleet availability below 99.95% target" },
    { sub: "performance", name: "Performance overview", question: "Where is request time being spent?", reading: `P99 ${ms(worstEp.p99)}`, audience: "Backend engineers", state: "bad", why: `${worstEp.method} ${worstEp.path} over SLO` },
    { sub: "errors", name: "Error overview", question: "What should we fix first?", reading: `${newIssues.length} new or regressed`, audience: "On-call", state: "bad", why: `${ERROR_GROUPS[0].name} on ${ERROR_GROUPS[0].service}` },
    { sub: "geo", name: "Geo analytics", question: "Where are users slow or failing?", reading: `${slowCountry.code} p95 ${ms(slowCountry.p95)}`, audience: "Platform", state: "bad", why: `${slowCountry.name} served from ${slowCountry.pop}` },
    { sub: "realtime", name: "Traffic overview", question: "What is happening right now?", reading: `${compact(SERVICES.reduce((a, s) => a + s.rps, 0))} req/s`, audience: "On-call", state: "warn", why: "5xx per minute above normal" },
    { sub: "tracing", name: "Service map", question: "Which dependency is slowing requests?", reading: "dispatcher → kafka 1.9s", audience: "Backend engineers", state: "bad", why: `${worstSvc?.id ?? "a service"} waits on its queue` },
    { sub: "infrastructure", name: "Infrastructure overview", question: "Is capacity and spend healthy?", reading: "Run rate $45.3K/mo", audience: "Platform", state: "bad", why: "dispatch-worker-pool saturated" },
    { sub: "security", name: "Security & threats", question: "Is anyone abusing our APIs?", reading: "1,284 failed logins", audience: "Security", state: "warn", why: "Credential stuffing from 3 addresses" },
    { sub: "releases", name: "Release quality", question: "Did the last deploy make things worse?", reading: `${badRelease?.service ?? ""} ${badRelease?.id ?? ""}`.trim(), audience: "Release owners", state: "bad", why: "Error rate 13× after deploy" },
    { sub: "business", name: "Business metrics", question: "How are customers using the API?", reading: "2,418 active tenants", audience: "Product", state: "ok", why: "Adoption and retention on track" },
  ];
  return { totals, rows };
}

export default function DashboardsOverview() {
  const { orgSlug } = useParams();
  const { totals, rows } = getOverviewBoard();
  const bad = rows.filter((r) => r.state === "bad").length;
  const warn = rows.filter((r) => r.state === "warn").length;

  const verdict: VerdictItem[] = [
    ...(bad ? [{ state: "bad" as const, text: `${bad} dashboards show failures` }] : []),
    ...(warn ? [{ state: "warn" as const, text: `${warn} show degradation` }] : []),
    { state: "ok", text: `${rows.length - bad - warn} clear` },
  ];

  return (
    <BoardPage
      title="Dashboards"
      description="Ten boards, one question each. Rows are lit by the data they watch, so open the red ones first."
      verdict={verdict}
    >
      <Readouts
        items={[
          { label: "Requests", value: compact(totals.requests), delta: "+12.4%", verdict: "flat", note: "vs previous 24h" },
          { label: "Error rate", value: pct(totals.errorRate), delta: "+0.09%", verdict: "bad", note: "vs previous 24h" },
          { label: "Services", value: String(SERVICES.length), note: `${SERVICES.filter((s) => s.state !== "ok").length} need attention` },
          { label: "Open error groups", value: String(ERROR_GROUPS.length), note: `${ERROR_GROUPS.filter((e) => e.status === "New").length} new today` },
          { label: "Deploys today", value: String(RELEASES.filter((r) => r.deployedAt.startsWith("Today")).length), note: "1 needs rollback", state: "bad" },
        ]}
      />

      <Ledger
        id="board"
        title="All dashboards"
        rows={rows}
        rowId={(r) => r.sub}
        rowState={(r) => r.state}
        primary={{
          header: "Dashboard",
          cell: (r) => (
            <Link
              to={orgRoutes.dashboards(orgSlug, r.sub)}
              className="group/link inline-flex items-center gap-1.5 rounded-[3px] text-[var(--text)] outline-none hover:underline hover:decoration-[var(--border2)] hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-[var(--text)]"
            >
              {r.name}
              <ArrowUpRight className="size-3.5 text-[var(--text3)] group-hover/link:text-[var(--text)]" aria-hidden="true" />
            </Link>
          ),
          sub: (r) => r.why,
        }}
        columns={[
          { key: "q", header: "Answers", hide: "lg", className: "font-sans text-[13px] text-[var(--text2)]", cell: (r) => r.question },
          { key: "reading", header: "Reading now", align: "right", cell: (r) => <span className="text-[var(--text)]">{r.reading}</span> },
          { key: "who", header: "For", hide: "md", align: "right", className: "font-sans text-[12px] text-[var(--text3)]", cell: (r) => r.audience },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Recent activity" meta="Across every board, today" flush>
          <Timeline items={ACTIVITY} />
        </Panel>
        <Panel title="Scheduled reports" meta="Delivered by email and Slack">
          <ul className="divide-y divide-[var(--border)] text-[13px]">
            {[
              { name: "Weekly reliability digest", when: "Mon 09:00", to: "#eng-leads" },
              { name: "Error budget burn", when: "Daily 08:00", to: "sre@acme.io" },
              { name: "Release quality summary", when: "After each deploy", to: "#releases" },
            ].map((r) => (
              <li key={r.name} className="flex items-baseline justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-[var(--text)]">{r.name}</span>
                  <span className="block truncate font-mono text-[12px] text-[var(--text3)]">{r.to}</span>
                </span>
                <span className="shrink-0 font-mono text-[12px] text-[var(--text2)]">{r.when}</span>
              </li>
            ))}
          </ul>
          <Link
            to={orgRoutes.dashboards(orgSlug, "reports")}
            className="mt-3 inline-flex items-center gap-1.5 rounded-[3px] text-[12px] font-medium text-[var(--text2)] outline-none hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--text)]"
          >
            Manage reports
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </Panel>
      </div>
    </BoardPage>
  );
}
