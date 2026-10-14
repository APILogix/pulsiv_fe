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
  Tag,
  TimeChart,
  Trend,
  stateText,
  type State,
  type VerdictItem,
} from "./board/kit";
import { HOURS_24, series } from "./board/fixtures";
import { compact } from "./board/format";

/*
 * Security & threats: is anyone abusing our APIs. Lead ledger ranks source
 * addresses by suspicious behaviour; each unfolds to its hourly shape and a
 * block action. Addresses use documentation ranges (RFC 5737).
 * Sample data only; getSecurityBoard() is the seam a live API replaces.
 */

type Pattern = "Credential stuffing" | "Token replay" | "Enumeration" | "Rate abuse" | "Scanner";

interface Source {
  ip: string;
  country: string;
  asn: string;
  pattern: Pattern;
  failedAuth: number;
  requests: number;
  targets: string;
  firstSeen: string;
  state: State;
  hourly: number[];
  blocked: boolean;
}

function src(s: Omit<Source, "hourly">, spikeAt?: number): Source {
  return { ...s, hourly: series(`sec-${s.ip}`, 24, s.failedAuth / 40, s.failedAuth / 60, { diurnal: false, spikeAt, spike: s.failedAuth / 6, floor: 0 }) };
}

const SOURCES: Source[] = [
  src({ ip: "203.0.113.42", country: "NL", asn: "AS64501 hosting", pattern: "Credential stuffing", failedAuth: 612, requests: 9_840, targets: "POST /auth/sessions", firstSeen: "12:14", state: "bad", blocked: false }, 18),
  src({ ip: "198.51.100.7", country: "RU", asn: "AS64502 hosting", pattern: "Credential stuffing", failedAuth: 418, requests: 6_120, targets: "POST /auth/sessions", firstSeen: "12:20", state: "bad", blocked: false }, 18),
  src({ ip: "192.0.2.199", country: "US", asn: "AS64503 cloud", pattern: "Token replay", failedAuth: 146, requests: 2_310, targets: "GET /v1/events", firstSeen: "09:02", state: "warn", blocked: false }, 10),
  src({ ip: "203.0.113.88", country: "SG", asn: "AS64504 cloud", pattern: "Enumeration", failedAuth: 58, requests: 14_700, targets: "GET /v1/projects/:id", firstSeen: "Sep 28", state: "warn", blocked: false }),
  src({ ip: "198.51.100.230", country: "BR", asn: "AS64505 ISP", pattern: "Rate abuse", failedAuth: 12, requests: 88_400, targets: "POST /v1/ingest", firstSeen: "Sep 27", state: "warn", blocked: false }),
  src({ ip: "192.0.2.14", country: "DE", asn: "AS64506 hosting", pattern: "Scanner", failedAuth: 38, requests: 1_020, targets: "/.env, /wp-admin", firstSeen: "03:40", state: "ok", blocked: true }),
];

const ENDPOINTS = [
  { path: "POST /auth/sessions", failed: 1_284, share: 11.2, state: "bad" as State },
  { path: "POST /auth/password/reset", failed: 212, share: 4.1, state: "warn" as State },
  { path: "GET /v1/projects/:id", failed: 58, share: 0.4, state: "ok" as State },
  { path: "POST /v1/billing/charges", failed: 9, share: 0.05, state: "ok" as State },
];

const JWT = [
  { label: "Expired", value: 1_560, state: undefined },
  { label: "Signature mismatch", value: 146, state: "warn" as State },
  { label: "Revoked but presented", value: 31, state: "warn" as State },
  { label: "Wrong audience", value: 12, state: undefined },
];

function getSecurityBoard() {
  const failed = series("sec-failed", 24, 38, 20, { diurnal: false, spikeAt: 18, spike: 260, floor: 0 });
  const baseline = series("sec-base", 24, 36, 10, { diurnal: false, floor: 0 });
  return { sources: SOURCES, failed, baseline, endpoints: ENDPOINTS, jwt: JWT };
}

const hourLabel = (i: number) => `${String(i).padStart(2, "0")}:00`;
const PATTERN_STATE: Record<Pattern, State> = { "Credential stuffing": "bad", "Token replay": "warn", Enumeration: "warn", "Rate abuse": "warn", Scanner: "idle" };

function SourceDetail({ s }: { s: Source }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <Facts
          items={[
            { label: "Network", value: s.asn },
            { label: "Country", value: s.country },
            { label: "Target", value: s.targets },
            { label: "Auth failure ratio", value: `${((s.failedAuth / s.requests) * 100).toFixed(1)}%`, state: s.state === "ok" ? undefined : s.state },
          ]}
        />
        <div className="mt-5">
          <TimeChart
            label={`Failed authentications per hour from ${s.ip}`}
            height={170}
            xLabels={HOURS_24}
            format={(v) => `${Math.round(v)}`}
            pointLabel={hourLabel}
            series={[{ label: "Failed auth", color: s.state === "bad" ? "var(--red)" : "var(--text)", data: s.hourly, area: true }]}
          />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {s.state === "bad" && (
          <ModelNote
            title="Same password list, two networks"
            confidence={93}
            action={<AiActionButton onClick={() => toast("Block rule drafted for both addresses (sample)")}>Block both sources</AiActionButton>}
          >
            {s.ip} and its pair try the same 1,900 email addresses in the same order, 40ms apart. No attempt has succeeded.
          </ModelNote>
        )}
        <div className="flex flex-wrap gap-2">
          <BoardButton onClick={() => toast(`${s.ip} ${s.blocked ? "unblocked" : "blocked for 24h"} (sample)`)}>
            {s.blocked ? "Unblock" : "Block for 24h"}
          </BoardButton>
          <BoardButton onClick={() => toast(`Requests from ${s.ip} opened (sample)`)}>View requests</BoardButton>
        </div>
      </div>
    </div>
  );
}

export default function SecurityThreat() {
  const { sources, failed, baseline, endpoints, jwt } = getSecurityBoard();
  const totalFailed = sources.reduce((a, s) => a + s.failedAuth, 0) + 90;
  const active = sources.filter((s) => s.state === "bad" && !s.blocked);

  const verdict: VerdictItem[] = [
    { state: "bad", text: `Credential stuffing from ${active.length} addresses, unblocked` },
    { state: "warn", text: `${sources.filter((s) => s.state === "warn").length} suspicious sources` },
    { state: "ok", text: "No successful account takeover" },
  ];

  return (
    <BoardPage title="Security & threats" description="Traffic that looks like abuse: failed logins, replayed tokens, scraping and scanners." verdict={verdict}>
      <Readouts
        items={[
          { label: "Failed logins", value: totalFailed.toLocaleString("en-US"), delta: "+640%", verdict: "bad", note: "vs 7-day average", state: "bad" },
          { label: "Suspicious sources", value: String(sources.length), note: `${sources.filter((s) => s.blocked).length} blocked` },
          { label: "Successful takeovers", value: "0", note: "last 30 days" },
          { label: "Invalid tokens", value: compact(jwt.reduce((a, j) => a + j.value, 0)), note: "rejected JWTs" },
          { label: "Rate-limited requests", value: "88.4K", note: "one source", state: "warn" },
          { label: "WAF blocks", value: "3,912", delta: "+12%", verdict: "flat" },
        ]}
      />

      <Ledger
        id="source"
        title="Suspicious sources"
        meta="Most active threat first"
        rows={sources}
        rowId={(s) => s.ip}
        rowState={(s) => (s.blocked ? "idle" : s.state)}
        attention={(s) => s.failedAuth}
        primary={{ header: "Source", cell: (s) => <span className="font-mono">{s.ip}</span>, sub: (s) => `${s.country} · ${s.asn}` }}
        columns={[
          { key: "pattern", header: "Pattern", className: "font-sans", cell: (s) => <Tag state={s.blocked ? "idle" : PATTERN_STATE[s.pattern]}>{s.blocked ? `${s.pattern}, blocked` : s.pattern}</Tag> },
          { key: "trend", header: "Failed auth, 24h", hide: "lg", cell: (s) => <Trend data={s.hourly} state={s.blocked ? "ok" : s.state} label={`Failed authentications per hour from ${s.ip}`} /> },
          { key: "fail", header: "Failed auth", align: "right", sortValue: (s) => s.failedAuth, cell: (s) => <span style={{ color: stateText(s.blocked ? "ok" : s.state) }}>{s.failedAuth.toLocaleString("en-US")}</span> },
          { key: "req", header: "Requests", align: "right", hide: "md", sortValue: (s) => s.requests, cell: (s) => compact(s.requests) },
          { key: "first", header: "First seen", align: "right", hide: "xl", cell: (s) => s.firstSeen },
        ]}
        detail={(s) => <SourceDetail s={s} />}
      />

      <Panel title="Failed authentications" meta="Per hour, today against the 7-day average">
        <TimeChart
          label="Failed authentications per hour today against the seven-day average"
          xLabels={HOURS_24}
          format={(v) => `${Math.round(v)}`}
          pointLabel={hourLabel}
          series={[
            { label: "Today", color: "var(--red)", data: failed, area: true },
            { label: "7-day average", color: "var(--text3)", data: baseline, dashed: true },
          ]}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Sensitive endpoints" meta="Failed attempts, 24h">
          <RankList
            label="Sensitive endpoints ranked by failed attempts"
            format={(v) => v.toLocaleString("en-US")}
            items={endpoints.map((e) => ({ label: e.path, value: e.failed, sub: `${e.share}% of calls`, state: e.state === "ok" ? undefined : e.state }))}
          />
        </Panel>
        <Panel title="Rejected tokens" meta="By reason, 24h">
          <RankList label="Rejected JWTs by reason" format={(v) => v.toLocaleString("en-US")} items={jwt} />
        </Panel>
      </div>
    </BoardPage>
  );
}
