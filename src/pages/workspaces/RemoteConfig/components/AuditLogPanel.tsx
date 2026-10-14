import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  HIDE_BELOW_XL,
  Sheet,
  SheetCell,
  SheetRow,
  SheetTable,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Notice } from "@/shared/ui/pulse";

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  environment: string;
  revision: number;
  summary: string;
  ip: string;
}

// Illustrative entries only: nothing here is read from this project's history.
const SAMPLE_AUDIT_LOGS: AuditEntry[] = [
  {
    id: "aud-109",
    timestamp: "2026-08-04 20:15:22",
    actor: "platform-admin@example.com",
    action: "publish_revision",
    environment: "Production (prod)",
    revision: 14,
    summary: "Updated trace sampling rate to 100% and enabled profiling.",
    ip: "192.0.2.104",
  },
  {
    id: "aud-108",
    timestamp: "2026-08-04 18:40:01",
    actor: "system-auto-governance",
    action: "rate_limit_adapt",
    environment: "Production (prod)",
    revision: 13,
    summary: "Automated adjustment of max payload size during traffic peak.",
    ip: "198.51.100.12",
  },
  {
    id: "aud-107",
    timestamp: "2026-08-04 14:10:05",
    actor: "devops-lead@example.com",
    action: "rollback_revision",
    environment: "Staging (staging)",
    revision: 12,
    summary: "Rolled back to revision 10 due to high memory overhead on worker nodes.",
    ip: "203.0.113.88",
  },
  {
    id: "aud-106",
    timestamp: "2026-08-03 22:00:19",
    actor: "platform-admin@example.com",
    action: "publish_revision",
    environment: "Development (dev)",
    revision: 11,
    summary: "Provisioned initial SDK configuration for node and web services.",
    ip: "192.0.2.104",
  },
];

const COLUMNS: SheetColumn[] = [
  { key: "time", header: "Time", className: "w-[168px]" },
  { key: "actor", header: "Actor", className: `w-[220px] ${HIDE_BELOW_MD}` },
  { key: "action", header: "Action", className: "w-[160px]" },
  { key: "environment", header: "Environment", className: `w-[160px] ${HIDE_BELOW_LG}` },
  { key: "revision", header: "Revision", align: "right", className: "w-[88px]" },
  { key: "summary", header: "Change", className: `w-full ${HIDE_BELOW_XL}` },
];

export function AuditLogPanel() {
  return (
    <div className="flex flex-col gap-6">
      <Notice tone="neutral" title="Preview with sample data">
        These entries are examples that show how the audit trail will read. They aren't this project's history;
        Revision history lists every revision that was actually published.
      </Notice>

      <Sheet
        title="Audit trail"
        description="Who published, rolled back, or changed this configuration, and when."
      >
        <SheetTable columns={COLUMNS} caption="Sample audit entries" minWidth={480}>
          {SAMPLE_AUDIT_LOGS.map((log) => (
            <SheetRow key={log.id}>
              <SheetCell>
                <span className="whitespace-nowrap font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text3)]">
                  {log.timestamp}
                </span>
              </SheetCell>
              <SheetCell className={`max-w-0 ${HIDE_BELOW_MD}`}>
                <span className="block truncate text-[13px] text-[var(--text)]" title={log.actor}>
                  {log.actor}
                </span>
              </SheetCell>
              <SheetCell>
                <code className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{log.action}</code>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                <span className="whitespace-nowrap text-[13px] text-[var(--text2)]">{log.environment}</span>
              </SheetCell>
              <SheetCell align="right">
                <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text)]">#{log.revision}</span>
              </SheetCell>
              <SheetCell className={`max-w-0 ${HIDE_BELOW_XL}`}>
                <span className="block truncate text-[13px] text-[var(--text2)]" title={`${log.summary} (from ${log.ip})`}>
                  {log.summary}
                </span>
              </SheetCell>
            </SheetRow>
          ))}
        </SheetTable>
      </Sheet>
    </div>
  );
}
