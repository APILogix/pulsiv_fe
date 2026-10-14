import { toast } from "sonner";
import { AiActionButton } from "@/shared/ui/sentinel";
import {
  BoardButton,
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
  type VerdictItem,
} from "./board/kit";
import { ERROR_GROUPS, RELEASES, series, type Release } from "./board/fixtures";
import { ms, pct } from "./board/format";

/*
 * Release quality: did the last deploy make things worse. Each release is a
 * row with its before → after readings and a verdict; unfolding it shows the
 * error rate either side of the deploy marker.
 * Sample data only; getReleaseBoard() is the seam a live API replaces.
 */

const SPAN = 24; // hours shown around each deploy; deploy lands at index 12
const AROUND = ["−12h", "−6h", "deploy", "+6h", "+12h"];

function getReleaseBoard() {
  const curves = Object.fromEntries(
    RELEASES.map((r) => {
      const before = series(`rel-b-${r.service}-${r.id}`, 12, r.errorBefore, r.errorBefore * 0.4, { diurnal: false, floor: 0 });
      const after = series(`rel-a-${r.service}-${r.id}`, 12, r.errorAfter, r.errorAfter * 0.35, { diurnal: false, floor: 0 });
      return [`${r.service}-${r.id}`, [...before, ...after]];
    }),
  ) as Record<string, number[]>;
  const week = [
    { label: "Deploys", value: 23 },
    { label: "Rolled back", value: 2 },
    { label: "Introduced a new issue", value: 4 },
  ];
  return { curves, week };
}

const key = (r: Release) => `${r.service}-${r.id}`;

function ReleaseDetail({ r, curve }: { r: Release; curve: number[] }) {
  const issues = ERROR_GROUPS.filter((e) => e.service === r.service && e.release === r.id && (e.status === "New" || e.status === "Regressed"));
  const mult = r.errorBefore ? r.errorAfter / r.errorBefore : 1;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <Facts
          items={[
            { label: "Deployed", value: r.deployedAt },
            { label: "Author", value: r.author },
            { label: "Commits", value: String(r.commits) },
            { label: "Error rate change", value: `${mult.toFixed(1)}×`, state: mult > 3 ? "bad" : mult > 1.2 ? "warn" : undefined },
          ]}
        />
        <div className="mt-5">
          <TimeChart
            label={`${r.service} error rate twelve hours either side of ${r.id}`}
            height={170}
            xLabels={AROUND}
            format={(v) => `${v.toFixed(2)}%`}
            pointLabel={(i) => (i < SPAN / 2 ? `${SPAN / 2 - i}h before deploy` : `${i - SPAN / 2 + 1}h after deploy`)}
            threshold={{ value: r.errorBefore, label: `before ${pct(r.errorBefore)}` }}
            series={[{ label: "Error rate", color: r.state === "bad" ? "var(--red)" : "var(--text)", data: curve, area: true }]}
          />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {r.state !== "ok" && (
          <ModelNote
            title={r.state === "bad" ? "This release caused the incident" : "Latency rose, errors did not"}
            confidence={r.state === "bad" ? 95 : 71}
            action={
              r.state === "bad" ? <AiActionButton onClick={() => toast(`Rollback to previous ${r.service} release queued (sample)`)}>Roll back</AiActionButton> : undefined
            }
          >
            {r.state === "bad"
              ? `Error rate went from ${pct(r.errorBefore)} to ${pct(r.errorAfter)} within 13 minutes of ${r.id} reaching 100%. Both new error groups first appear after the deploy.`
              : `P95 moved from ${ms(r.p95Before)} to ${ms(r.p95After)} on the ${r.adoption}% of traffic running ${r.id}. Hold the rollout until p99 settles.`}
          </ModelNote>
        )}
        {issues.length > 0 && (
          <div>
            <p className="text-[12px] text-[var(--text3)]">Issues introduced</p>
            <ul className="mt-1.5 divide-y divide-[var(--border)] text-[12px]">
              {issues.map((e) => (
                <li key={e.id} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="truncate font-mono text-[var(--text)]">{e.name}</span>
                  <Tag state={e.status === "New" ? "bad" : "warn"}>{e.status}</Tag>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <BoardButton onClick={() => toast(`Diff for ${r.id} opened (sample)`)}>View diff</BoardButton>
          <BoardButton onClick={() => toast(`${r.id} marked as reviewed (sample)`)}>Mark reviewed</BoardButton>
        </div>
      </div>
    </div>
  );
}

export default function ReleaseQuality() {
  const { curves, week } = getReleaseBoard();
  const bad = RELEASES.filter((r) => r.state === "bad");
  const watch = RELEASES.filter((r) => r.state === "warn");
  const crashFree = RELEASES.reduce((a, r) => a + r.crashFree, 0) / RELEASES.length;

  const verdict: VerdictItem[] = [
    ...bad.map((r) => ({ state: "bad" as const, text: `Roll back ${r.service} ${r.id}` })),
    ...watch.map((r) => ({ state: "warn" as const, text: `Watch ${r.service} ${r.id}` })),
    { state: "ok", text: `${RELEASES.length - bad.length - watch.length} releases healthy` },
  ];

  return (
    <BoardPage
      title="Release quality"
      description="Every recent deploy with its error rate and latency before and after. Unfold a release to see the moment it shipped."
      verdict={verdict}
      window="Last 7 days"
    >
      <Readouts
        items={[
          { label: "Deploys this week", value: "23", delta: "+4", verdict: "flat" },
          { label: "Change failure rate", value: "8.7%", delta: "+2.1 pts", verdict: "bad", note: "2 of 23 rolled back" },
          { label: "Crash-free, latest", value: pct(crashFree), note: "across services", state: crashFree < 99.5 ? "warn" : undefined },
          { label: "New issues from deploys", value: String(RELEASES.reduce((a, r) => a + r.newIssues, 0)), note: "this week", state: "warn" },
          { label: "Lead time to deploy", value: "3.4h", delta: "−0.6h", verdict: "good", note: "median" },
        ]}
      />

      <Ledger
        id="release"
        title="Releases"
        meta="Worst regression first"
        rows={RELEASES}
        rowId={key}
        rowState={(r) => r.state}
        attention={(r) => r.errorAfter - r.errorBefore}
        primary={{ header: "Release", cell: (r) => <span className="font-mono">{r.service} {r.id}</span>, sub: (r) => `${r.deployedAt} · ${r.author} · ${r.commits} commits` }}
        columns={[
          {
            key: "adopt",
            header: "Traffic",
            align: "right",
            hide: "lg",
            className: "w-[140px]",
            cell: (r) => (
              <span className="flex items-center justify-end gap-3">
                <Meter value={r.adoption} max={100} className="w-14" />
                <span className="w-9">{r.adoption}%</span>
              </span>
            ),
          },
          {
            key: "err",
            header: "Error rate",
            align: "right",
            sortValue: (r) => r.errorAfter - r.errorBefore,
            cell: (r) => (
              <span>
                <span className="text-[var(--text3)]">{pct(r.errorBefore)} → </span>
                <span style={{ color: stateText(r.errorAfter > r.errorBefore * 3 ? "bad" : r.errorAfter > r.errorBefore * 1.2 ? "warn" : "ok") }}>{pct(r.errorAfter)}</span>
              </span>
            ),
          },
          {
            key: "p95",
            header: "P95",
            align: "right",
            hide: "md",
            sortValue: (r) => r.p95After - r.p95Before,
            cell: (r) => (
              <span>
                <span className="text-[var(--text3)]">{ms(r.p95Before)} → </span>
                <span style={{ color: stateText(r.p95After > r.p95Before * 2 ? "bad" : r.p95After > r.p95Before * 1.25 ? "warn" : "ok") }}>{ms(r.p95After)}</span>
              </span>
            ),
          },
          { key: "verdict", header: "Verdict", align: "right", className: "font-sans", cell: (r) => <Tag state={r.state}>{r.verdict}</Tag> },
        ]}
        detail={(r) => <ReleaseDetail r={r} curve={curves[key(r)]} />}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Crash-free sessions by release" meta="Latest release per service">
          <RankList
            label="Crash-free session rate by release"
            format={(v) => `${v.toFixed(1)}%`}
            items={[...RELEASES]
              .sort((a, b) => a.crashFree - b.crashFree)
              .map((r) => ({ label: `${r.service} ${r.id}`, value: r.crashFree, state: r.crashFree < 98 ? "bad" : r.crashFree < 99.7 ? "warn" : undefined }))}
          />
        </Panel>
        <Panel title="This week" meta="Deploy outcomes">
          <RankList label="Deploy outcomes this week" format={(v) => String(v)} items={week.map((w, i) => ({ ...w, state: i === 0 ? undefined : "warn" }))} />
        </Panel>
      </div>
    </BoardPage>
  );
}
