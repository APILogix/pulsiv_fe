import { useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, GitCommit, Check } from "lucide-react";
import { useErrorGroups } from "@/hooks/useDummyData";
import {
  PageHeader, SectionCard, FilterSelect,
  Table, Tr, Td, SeverityBadge, MonospaceText, Timestamp,
} from "@/shared/observe";
import { MultiLineChart, Banner, StatTile, ChartCard, HeroBand, ZoneLabel } from "./widgets";
import { seededSeries } from "./lib";

const RELEASES = ["v2.4.1", "v2.4.0", "v2.3.8", "v2.3.7"];
const RELEASE_OPTIONS = RELEASES.map((r) => ({ value: r, label: r }));

interface CompareRow { metric: string; prev: string; curr: string; delta: string; status: "improved" | "degraded" | "stable" }
const COMPARISON: CompareRow[] = [
  { metric: "Error rate", prev: "0.12%", curr: "0.53%", delta: "+341%", status: "degraded" },
  { metric: "P50 latency", prev: "82ms", curr: "79ms", delta: "-3.7%", status: "improved" },
  { metric: "P95 latency", prev: "240ms", curr: "812ms", delta: "+238%", status: "degraded" },
  { metric: "P99 latency", prev: "640ms", curr: "1.2s", delta: "+88%", status: "degraded" },
  { metric: "Throughput", prev: "14.2k rpm", curr: "14.8k rpm", delta: "+4.2%", status: "improved" },
  { metric: "Unique error groups", prev: "12", curr: "19", delta: "+7", status: "degraded" },
];

const STATUS_TONE: Record<string, string> = { improved: "var(--green)", degraded: "var(--red)", stable: "var(--text3)" };

export default function ReleaseQuality() {
  const navigate = useNavigate();
  const [release, setRelease] = useState(RELEASES[0]);
  const groups = useErrorGroups();
  const groupList = groups.data ?? [];

  const newErrors = groupList.slice(0, 5);
  const resolvedCount = 8;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Release Quality & CI/CD Health"
        description="Ensure every deploy improves the system, not breaks it · last 30 days."
        actions={<FilterSelect label="Release" value={release} onChange={setRelease} options={RELEASE_OPTIONS} />}
      />

      <Banner
        tone="red"
        icon={AlertTriangle}
        title={<>Consider rollback — <strong>{release}</strong> error rate increased 341% (0.12% → 0.53%) and P95 latency up 238%.</>}
        action={<div className="flex gap-2"><button className="rounded-[6px] border border-current px-2 py-1 text-[12px]">Initiate rollback</button><button onClick={() => navigate("/dashboards/errors")} className="rounded-[6px] border border-current px-2 py-1 text-[12px]">View errors</button></div>}
      />

      <HeroBand
        metrics={[
          { label: "Deploy frequency", value: "4.2 / wk", delta: "Elite (DORA)", trend: "up", spark: seededSeries("rq-freq", 20, 20, 8) },
          { label: "Lead time", value: "3.4h", delta: "commit → prod", trend: "up", spark: seededSeries("rq-lead", 20, 30, 10), sparkColor: "var(--blue)" },
          { label: "MTTR", value: "42m", delta: "High (DORA)", trend: "up", spark: seededSeries("rq-mttr", 20, 25, 12), sparkColor: "var(--amber)" },
          { label: "Change failure rate", value: "14%", delta: "Medium (DORA)", trend: "down", spark: seededSeries("rq-cfr", 20, 15, 6), sparkColor: "var(--red)" },
        ]}
      />

      <ZoneLabel>Release comparison</ZoneLabel>

      <SectionCard title={`Release comparison — ${release} vs previous`}>
        <Table headers={["Metric", "Previous (baseline)", "Current", "Delta", "Status"]}>
          {COMPARISON.map((row) => (
            <Tr key={row.metric}>
              <Td className="font-medium">{row.metric}</Td>
              <Td className="tabular-nums text-[var(--text2)]">{row.prev}</Td>
              <Td className="tabular-nums">{row.curr}</Td>
              <Td><span style={{ color: STATUS_TONE[row.status] }} className="tabular-nums font-semibold">{row.delta}</span></Td>
              <Td><span style={{ color: STATUS_TONE[row.status] }} className="capitalize">{row.status}</span></Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>

      <ChartCard
        title="Canary deployment health"
        legend={[
          { label: "Canary error rate (5%)", color: "var(--red)" },
          { label: "Stable error rate (95%)", color: "var(--green)" },
        ]}
        timeAxis="32 samples ago"
      >
        <MultiLineChart
          series={[
            { label: "Canary error rate (5%)", color: "var(--red)", data: seededSeries("canary", 32, 14, 8) },
            { label: "Stable error rate (95%)", color: "var(--green)", data: seededSeries("stable", 32, 6, 3) },
          ]}
        />
        <div className="mt-3 flex items-center gap-3 rounded-[8px] bg-[var(--bg2)] px-3 py-2 text-[12px]">
          <AlertTriangle className="size-4 text-[var(--amber)]" />
          <span className="text-[var(--text2)]">Decision gate: canary error rate &gt; 2× stable → recommend <strong className="text-[var(--red)]">rollback canary</strong>.</span>
        </div>
      </ChartCard>

      <ZoneLabel>Error delta</ZoneLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="New error types introduced">
          <Table headers={["Error", "Fingerprint", "Severity", "Count", "Users", "First seen"]}>
            {newErrors.map((g) => (
              <Tr key={g.fingerprint} onClick={() => navigate(`/observability/errors/${g.fingerprint}`)}>
                <Td><span className="truncate">{g.name}</span></Td>
                <Td><MonospaceText value={g.fingerprint.slice(0, 8)} className="text-[var(--text3)]" /></Td>
                <Td><SeverityBadge severity={g.severity} /></Td>
                <Td className="tabular-nums">{g.count}</Td>
                <Td className="tabular-nums">{g.affectedUsers.size}</Td>
                <Td><Timestamp value={g.firstSeen} /></Td>
              </Tr>
            ))}
          </Table>
        </SectionCard>

        <SectionCard title="Resolved error groups">
          <div className="flex flex-col items-center justify-center gap-2 py-6">
            <Check className="size-10 text-[var(--green)]" />
            <div className="text-3xl font-semibold tabular-nums text-[var(--text)]">{resolvedCount}</div>
            <div className="text-[13px] text-[var(--text2)]">errors fixed in {release}</div>
          </div>
        </SectionCard>
      </div>

      <ZoneLabel>Root cause</ZoneLabel>

      <SectionCard title="Suspect commit detection" action={<GitCommit className="size-4 text-[var(--text3)]" />}>
        <Table headers={["Commit", "Author", "Message", "Files", "Errors introduced", "Confidence"]}>
          {[
            { hash: "a3f9c21", author: "k.patel", msg: "refactor: payment validation pipeline", files: 7, errors: 4, conf: 91 },
            { hash: "e81b0fd", author: "m.chen", msg: "feat: add retry to upstream client", files: 3, errors: 1, conf: 62 },
            { hash: "7d2a4e8", author: "s.gupta", msg: "chore: bump prisma to 5.x", files: 12, errors: 2, conf: 74 },
          ].map((c) => (
            <Tr key={c.hash}>
              <Td><MonospaceText value={c.hash} className="text-[var(--brand)]" /></Td>
              <Td className="text-[var(--text2)]">{c.author}</Td>
              <Td><span className="truncate">{c.msg}</span></Td>
              <Td className="tabular-nums">{c.files}</Td>
              <Td className="tabular-nums">{c.errors}</Td>
              <Td><span style={{ color: c.conf > 80 ? "var(--red)" : "var(--amber)" }} className="tabular-nums font-semibold">{c.conf}%</span></Td>
            </Tr>
          ))}
        </Table>
        <div className="mt-2 text-[11px] text-[var(--text3)]">Requires git integration (GitHub/GitLab webhook) — correlating error spikes with recent commits.</div>
      </SectionCard>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Releases (30d)" value={RELEASES.length * 4} />
        <StatTile label="Rollbacks (30d)" value={2} tone="var(--amber)" />
        <StatTile label="Failed deploys" value={3} tone="var(--red)" />
        <StatTile label="Successful deploys" value={RELEASES.length * 4 - 3} tone="var(--green)" />
      </div>
    </div>
  );
}
