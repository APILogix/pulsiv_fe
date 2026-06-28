import { ShieldAlert, Lock, KeyRound } from "lucide-react";
import { useRequestEvents, useErrorEvents } from "@/hooks/useDummyData";
import { useTimeRangeStore, TIME_RANGES } from "@/stores/timeRangeStore";
import {
  PageHeader, SectionCard, KpiCard, FilterSelect,
  Table, Tr, Td, MonospaceText, Timestamp, SeverityBadge, formatCompact,
} from "@/shared/observe";
import { Gauge, MultiLineChart, Banner, StatTile } from "./widgets";
import { seededSeries, groupBy, countryForIp } from "./lib";

const TIME_OPTIONS = TIME_RANGES.map((r) => ({ value: r, label: r }));
const SENSITIVE = ["/admin", "/billing", "/users/export", "/api/v1/keys", "/settings/organization"];

export default function SecurityThreat() {
  const timeRange = useTimeRangeStore((s) => s.timeRange);
  const setTimeRange = useTimeRangeStore((s) => s.setTimeRange);
  const requests = useRequestEvents();
  const errors = useErrorEvents();

  const reqList = requests.data ?? [];
  const errList = errors.data ?? [];

  const authFails = reqList.filter((r) => r.statusCode === 401 || r.statusCode === 403);
  const rateLimited = reqList.filter((r) => r.statusCode === 429);
  const securityScore = Math.max(0, Math.min(100, 92 - authFails.length * 2 - rateLimited.length));

  // Failed auth by IP
  const byIp = Object.entries(groupBy(authFails, (r) => r.clientIp))
    .map(([ip, rs]) => ({ ip, count: rs.length, country: countryForIp(ip), endpoint: rs[0]?.route ?? "—" }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Sensitive endpoint access
  const sensitiveAccess = SENSITIVE.map((path) => {
    const matched = reqList.filter((r) => r.route.includes(path) || r.url.includes(path));
    return {
      path,
      count: matched.length || Math.floor(Math.random() * 40),
      users: new Set(matched.map((r) => r.userId).filter(Boolean)).size || 3,
      failed: matched.filter((r) => r.statusCode === 403).length,
    };
  });

  // API key abuse (by tenant as proxy)
  const keyAbuse = Object.entries(groupBy(reqList, (r) => r.tenantId))
    .map(([tenant, rs]) => {
      const countries = new Set(rs.map((r) => countryForIp(r.clientIp).code)).size;
      const errRate = (rs.filter((r) => r.statusCode >= 400).length / rs.length) * 100;
      const risk = Math.min(100, countries * 12 + errRate);
      return { key: `pulse_${tenant.slice(0, 6)}`, count: rs.length, countries, errRate, risk };
    })
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 6);

  // JWT anomalies from errors
  const jwtAnomalies = errList.filter((e) => /jwt|token|signature|expired/i.test(e.message + e.name)).slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Security & Threat Detection"
        description="Detect, investigate, and respond to API security threats · auto-refresh 30s."
        actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
      />

      {byIp[0]?.count > 10 && (
        <Banner tone="red" icon={ShieldAlert} title={<>Brute force suspected — <strong>{byIp[0].count} failed auth attempts</strong> from <span className="font-[family-name:var(--mono)]">{byIp[0].ip}</span>.</>} action={<button className="rounded-[6px] border border-current px-2 py-1 text-[12px]">Block IP</button>} />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <SectionCard className="flex items-center justify-center lg:row-span-2">
          <Gauge value={securityScore} label={`${securityScore}`} sublabel="Security score — auth failures, suspicious IPs, rate-limit hits" color={securityScore < 50 ? "var(--red)" : securityScore < 80 ? "var(--amber)" : "var(--green)"} />
        </SectionCard>
        <KpiCard label="Failed auth (401/403)" value={authFails.length} delta="last window" trend="down" icon={Lock} />
        <KpiCard label="Rate-limited (429)" value={rateLimited.length} delta="possible abuse" trend="down" />
        <KpiCard label="Suspicious IPs" value={byIp.length} delta="flagged" trend="down" />
        <KpiCard label="JWT anomalies" value={jwtAnomalies.length} delta="token issues" trend="down" icon={KeyRound} />
        <KpiCard label="Sensitive accesses" value={formatCompact(sensitiveAccess.reduce((s, x) => s + x.count, 0))} delta="audited" trend="neutral" />
      </div>

      <SectionCard title="Failed authentication attempts over time">
        <MultiLineChart
          series={[
            { label: "401 Unauthorized", color: "var(--amber)", data: seededSeries("401", 32, authFails.length / 2 + 4, 8) },
            { label: "403 Forbidden", color: "var(--red)", data: seededSeries("403", 32, authFails.length / 3 + 2, 6) },
          ]}
        />
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Failed auth by source IP">
          <Table headers={["IP address", "Country", "Attempts", "Endpoint"]}>
            {byIp.map((r) => (
              <Tr key={r.ip}>
                <Td><MonospaceText value={r.ip} /></Td>
                <Td>{r.country.flag} {r.country.code}</Td>
                <Td><span style={{ color: r.count > 10 ? "var(--red)" : "var(--text)" }} className="tabular-nums font-semibold">{r.count}</span></Td>
                <Td><MonospaceText value={r.endpoint} className="max-w-[160px]" /></Td>
              </Tr>
            ))}
          </Table>
        </SectionCard>

        <SectionCard title="Unusual traffic patterns">
          <div className="flex flex-col gap-2">
            {[
              { type: "Traffic spike from new country", sev: "high", endpoint: "/api/v1/auth/login", conf: 92 },
              { type: "Requests outside business hours", sev: "medium", endpoint: "/admin/users", conf: 74 },
              { type: "Sudden endpoint popularity shift", sev: "low", endpoint: "/api/v1/export", conf: 61 },
              { type: "Unusual user-agent pattern", sev: "critical", endpoint: "/api/v1/keys", conf: 88 },
            ].map((a) => (
              <div key={a.type} className="flex items-center gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-3">
                <SeverityBadge severity={a.sev} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-[var(--text)]">{a.type}</div>
                  <div className="truncate font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">{a.endpoint}</div>
                </div>
                <span className="shrink-0 text-[11px] text-[var(--text3)]">{a.conf}% conf</span>
                <button className="shrink-0 rounded-[6px] border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--brand)]">Investigate</button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Sensitive endpoint access">
        <Table headers={["Endpoint", "Access count", "Unique users", "Failed (403)", "After-hours %", "Last accessed"]}>
          {sensitiveAccess.map((s) => (
            <Tr key={s.path}>
              <Td><MonospaceText value={s.path} /></Td>
              <Td className="tabular-nums">{s.count}</Td>
              <Td className="tabular-nums">{s.users}</Td>
              <Td><span style={{ color: s.failed > 0 ? "var(--amber)" : "var(--text)" }} className="tabular-nums">{s.failed}</span></Td>
              <Td className="tabular-nums">{Math.round((s.count % 30))}%</Td>
              <Td><Timestamp value={Date.now() - s.count * 60000} /></Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="API key abuse detection">
          <Table headers={["Key", "Requests", "Countries", "Err %", "Risk"]}>
            {keyAbuse.map((k) => (
              <Tr key={k.key}>
                <Td><MonospaceText value={`${k.key}...`} /></Td>
                <Td className="tabular-nums">{k.count}</Td>
                <Td className="tabular-nums">{k.countries}</Td>
                <Td className="tabular-nums">{k.errRate.toFixed(0)}%</Td>
                <Td><span style={{ color: k.risk > 80 ? "var(--red)" : k.risk > 50 ? "var(--amber)" : "var(--green)" }} className="tabular-nums font-semibold">{Math.round(k.risk)}</span></Td>
              </Tr>
            ))}
          </Table>
          {keyAbuse[0]?.risk > 80 && <div className="mt-2 text-[12px] text-[var(--red)]">Suggested: rotate {keyAbuse[0].key}... (risk {Math.round(keyAbuse[0].risk)})</div>}
        </SectionCard>

        <SectionCard title="JWT token anomalies">
          {jwtAnomalies.length ? (
            <div className="flex flex-col divide-y divide-[var(--border)]">
              {jwtAnomalies.map((e) => (
                <div key={e.eventId} className="flex items-center gap-3 py-2 first:pt-0">
                  <SeverityBadge severity={e.severity} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium text-[var(--text)]">{e.name}</div>
                    <div className="truncate text-[11px] text-[var(--text3)]">{e.message}</div>
                  </div>
                  <Timestamp value={e.timestamp} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {["Token replay (same JWT, different IPs)", "Expired token attempts", "Malformed JWT signatures", "Privilege escalation attempts"].map((d) => (
                <div key={d} className="flex items-center justify-between rounded-[8px] bg-[var(--bg2)] px-3 py-2 text-[12px]">
                  <span className="text-[var(--text2)]">{d}</span>
                  <span className="tabular-nums text-[var(--text3)]">{Math.floor(Math.random() * 5)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Rate-limit evasion suspects" value={Math.max(0, rateLimited.length - 2)} />
        <StatTile label="Blocked IPs (24h)" value={3} />
        <StatTile label="MFA challenges" value={formatCompact(reqList.length * 2)} />
        <StatTile label="Audit events" value={formatCompact(reqList.length * 6)} />
      </div>
    </div>
  );
}
