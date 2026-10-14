import { useState } from "react";
import { toast } from "sonner";
import { AiActionButton } from "@/shared/ui/sentinel";
import {
  BoardButton,
  BoardPage,
  Facts,
  Ledger,
  ModelNote,
  Panel,
  RankList,
  Readouts,
  Segmented,
  SplitBar,
  Tag,
  TimeChart,
  Trend,
  stateText,
  type State,
  type VerdictItem,
} from "./board/kit";
import { ERROR_GROUPS, HOURS_24, type ErrorGroup, type IssueStatus, type Mechanism } from "./board/fixtures";
import { compact } from "./board/format";

/*
 * Error overview: what to fix first. The triage queue ranks error groups by
 * state, then by events; each row unfolds to its hourly shape, frame and a
 * model-suggested cause.
 * Sample data only; getErrorBoard() is the seam a live API replaces.
 */

const MECHANISMS: Mechanism[] = ["Unhandled", "Handled", "Promise rejection", "HTTP 5xx"];
const STATUS_STATE: Record<IssueStatus, State> = { New: "bad", Regressed: "warn", Ongoing: "idle", Resolving: "ok" };

const CAUSES: Record<string, string> = {
  "ERR-4F2A": "Consumers stopped scaling after v3.8.2 lowered max workers from 32 to 8. The queue fills within four minutes of peak traffic.",
  "ERR-19C7": "Timeouts follow the queue backlog: dispatcher retries hold connections to ingest-gateway past the 2s client deadline.",
  "ERR-2D55": "SDK 4.12 batches up to 8 MB when offline buffering flushes. The gateway limit is still 5 MB.",
  "ERR-A031": "Traces with zero spans reach assemble() since v2.41.0 removed the empty-trace guard.",
};

function getErrorBoard() {
  const events = ERROR_GROUPS.reduce((a, e) => a + e.events, 0);
  const users = ERROR_GROUPS.reduce((a, e) => a + e.users, 0);
  const byMechanism = MECHANISMS.map((m) => ({ m, value: ERROR_GROUPS.filter((e) => e.mechanism === m).reduce((a, e) => a + e.events, 0) }));
  const byService = Object.entries(
    ERROR_GROUPS.reduce<Record<string, { events: number; state: State }>>((acc, e) => {
      const cur = acc[e.service] ?? { events: 0, state: "ok" };
      cur.events += e.events;
      if (e.state === "bad" || (e.state === "warn" && cur.state !== "bad")) cur.state = e.state;
      acc[e.service] = cur;
      return acc;
    }, {}),
  ).sort((a, b) => b[1].events - a[1].events);
  const byRelease = Object.entries(
    ERROR_GROUPS.reduce<Record<string, number>>((acc, e) => {
      const k = `${e.service} ${e.release}`;
      acc[k] = (acc[k] ?? 0) + (e.status === "New" || e.status === "Regressed" ? 1 : 0);
      return acc;
    }, {}),
  )
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  return { events, users, byMechanism, byService, byRelease };
}

const hourLabel = (i: number) => `${String(i).padStart(2, "0")}:00`;

function IssueDetail({ e }: { e: ErrorGroup }) {
  const cause = CAUSES[e.id];
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <Facts
          items={[
            { label: "First seen", value: e.firstSeen },
            { label: "Release", value: e.release },
            { label: "Mechanism", value: e.mechanism },
            { label: "Issue", value: e.id },
          ]}
        />
        <div className="mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg1)] px-3 py-2.5 font-mono text-[12px] leading-[1.6]">
          <p className="text-[var(--text)]">
            {e.name}: {e.message}
          </p>
          <p className="text-[var(--text3)]">  at {e.frame}</p>
        </div>
        <div className="mt-5">
          <TimeChart
            label={`${e.name} events per hour over 24 hours`}
            height={170}
            xLabels={HOURS_24}
            format={compact}
            pointLabel={hourLabel}
            series={[{ label: "Events", color: e.state === "bad" ? "var(--red)" : "var(--text)", data: e.hourly, area: true }]}
          />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {cause && (
          <ModelNote
            title="Likely cause"
            confidence={e.state === "bad" ? 88 : 70}
            action={<AiActionButton onClick={() => toast("Fix suggestion drafted (sample)")}>Draft fix</AiActionButton>}
          >
            {cause}
          </ModelNote>
        )}
        <div className="flex flex-wrap gap-2">
          <BoardButton onClick={() => toast(`${e.id} assigned to you (sample)`)}>Assign to me</BoardButton>
          <BoardButton onClick={() => toast(`${e.id} marked resolved in next release (sample)`)}>Resolve in next release</BoardButton>
          <BoardButton onClick={() => toast(`${e.id} ignored for 24h (sample)`)}>Ignore for 24h</BoardButton>
        </div>
      </div>
    </div>
  );
}

export default function ErrorTriage() {
  const [mechanism, setMechanism] = useState<"all" | Mechanism>("all");
  const { events, users, byMechanism, byService, byRelease } = getErrorBoard();
  const rows = mechanism === "all" ? ERROR_GROUPS : ERROR_GROUPS.filter((e) => e.mechanism === mechanism);
  const fresh = ERROR_GROUPS.filter((e) => e.status === "New").length;
  const regressed = ERROR_GROUPS.filter((e) => e.status === "Regressed").length;

  const verdict: VerdictItem[] = [
    { state: "bad", text: `${fresh} new issues since this morning` },
    { state: "warn", text: `${regressed} regressed` },
    { state: "ok", text: `${ERROR_GROUPS.length - fresh - regressed} known and stable` },
  ];

  return (
    <BoardPage title="Error overview" description="Every error group ranked by what it is doing to customers now. Fix from the top." verdict={verdict}>
      <Readouts
        items={[
          { label: "Error events", value: compact(events), delta: "+184%", verdict: "bad", note: "vs previous 24h", state: "bad" },
          { label: "Affected users", value: users.toLocaleString("en-US"), delta: "+1,106", verdict: "bad" },
          { label: "New groups", value: String(fresh), note: "since 00:00", state: fresh ? "bad" : undefined },
          { label: "Regressed", value: String(regressed), note: "reopened by a release", state: regressed ? "warn" : undefined },
          { label: "Crash-free sessions", value: "99.12%", delta: "−0.41%", verdict: "bad", note: "target 99.5%" },
          { label: "5xx rate", value: "0.38%", delta: "+0.21%", verdict: "bad" },
        ]}
      />

      <Ledger
        id="issue"
        title="Triage queue"
        meta="New and regressed first, then by events"
        rows={rows}
        rowId={(e) => e.id}
        rowState={(e) => e.state}
        attention={(e) => e.events}
        action={
          <Segmented
            label="Mechanism"
            value={mechanism}
            onChange={setMechanism}
            options={[{ value: "all" as const, label: "All" }, ...MECHANISMS.map((m) => ({ value: m, label: m === "Promise rejection" ? "Promise" : m }))]}
          />
        }
        primary={{ header: "Issue", cell: (e) => <span className="font-mono">{e.name}</span>, sub: (e) => e.message }}
        columns={[
          { key: "status", header: "Status", className: "font-sans", cell: (e) => <Tag state={STATUS_STATE[e.status]}>{e.status}</Tag> },
          { key: "trend", header: "Events, 24h", hide: "lg", cell: (e) => <Trend data={e.hourly} state={e.state} label={`${e.name} events per hour`} /> },
          { key: "events", header: "Events", align: "right", sortValue: (e) => e.events, cell: (e) => <span style={{ color: stateText(e.state) }}>{compact(e.events)}</span> },
          { key: "users", header: "Users", align: "right", sortValue: (e) => e.users, cell: (e) => e.users.toLocaleString("en-US") },
          { key: "svc", header: "Service", hide: "xl", cell: (e) => e.service },
          { key: "last", header: "Last seen", align: "right", hide: "md", cell: (e) => e.lastSeen },
        ]}
        detail={(e) => <IssueDetail e={e} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="By mechanism" meta="Events, 24h">
          <SplitBar
            label="Error events by mechanism"
            format={compact}
            segments={byMechanism.map(({ m, value }, i) => ({ label: m, value, color: ["var(--text)", "var(--text3)", "var(--violet)", "var(--red)"][i] }))}
          />
        </Panel>
        <Panel title="By service" meta="Events, 24h">
          <RankList
            label="Services ranked by error events"
            format={compact}
            items={byService.map(([svc, v]) => ({ label: svc, value: v.events, state: v.state === "ok" ? undefined : v.state }))}
          />
        </Panel>
        <Panel title="By release" meta="New or regressed groups introduced">
          <RankList
            label="Releases ranked by new or regressed error groups"
            format={(v) => `${v} ${v === 1 ? "group" : "groups"}`}
            items={byRelease.map(([rel, n]) => ({ label: rel, value: n, state: n > 1 ? "bad" : "warn" }))}
          />
        </Panel>
      </div>
    </BoardPage>
  );
}
