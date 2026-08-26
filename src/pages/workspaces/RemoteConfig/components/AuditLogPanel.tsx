import React from "react";
import { FileText, History, User, Globe, Shield, Clock } from "lucide-react";
import { SectionCard, StatusBadge } from "@/shared/observe";

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

const MOCK_AUDIT_LOGS: AuditEntry[] = [
  {
    id: "aud-109",
    timestamp: "2026-08-04 20:15:22",
    actor: "vikas@sentinel.io (Platform Admin)",
    action: "PUBLISH_REVISION",
    environment: "Production (prod)",
    revision: 14,
    summary: "Updated trace sampling rate to 100% and enabled profiling.",
    ip: "192.168.1.104",
  },
  {
    id: "aud-108",
    timestamp: "2026-08-04 18:40:01",
    actor: "system-auto-governance",
    action: "RATE_LIMIT_ADAPT",
    environment: "Production (prod)",
    revision: 13,
    summary: "Automated adjustment of max payload size during traffic peak.",
    ip: "10.0.4.12",
  },
  {
    id: "aud-107",
    timestamp: "2026-08-04 14:10:05",
    actor: "alex.dev@sentinel.io (DevOps Lead)",
    action: "ROLLBACK_REVISION",
    environment: "Staging (staging)",
    revision: 12,
    summary: "Rolled back to Revision 10 due to high memory overhead on worker nodes.",
    ip: "172.16.2.88",
  },
  {
    id: "aud-106",
    timestamp: "2026-08-03 22:00:19",
    actor: "vikas@sentinel.io (Platform Admin)",
    action: "PUBLISH_REVISION",
    environment: "Development (dev)",
    revision: 11,
    summary: "Provisioned initial SDK configuration for node and web services.",
    ip: "192.168.1.104",
  },
];

export function AuditLogPanel() {
  return (
    <SectionCard
      title="Enterprise Audit Trail & Configuration Log"
      description="Immutable log of all published revisions, rollbacks, automated governance actions, and operator details."
    >
      <div className="flex flex-col gap-3 py-2">
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg2)]/40">
          <table className="w-full text-left text-xs text-[var(--text2)]">
            <thead className="border-b border-[var(--border)] bg-[var(--bg2)] text-[10px] uppercase font-bold text-[var(--text3)]">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Operator / Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Environment</th>
                <th className="p-3">Revision</th>
                <th className="p-3">Change Details</th>
                <th className="p-3 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]/60">
              {MOCK_AUDIT_LOGS.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--bg1)] transition-colors">
                  <td className="p-3 font-mono text-[11px] text-[var(--text3)] whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3 text-sky-400" />
                      {log.timestamp}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-[var(--text)] whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <User className="size-3 text-indigo-400" />
                      {log.actor}
                    </span>
                  </td>
                  <td className="p-3">
                    <StatusBadge status={log.action} />
                  </td>
                  <td className="p-3 font-medium text-[var(--text)] whitespace-nowrap">{log.environment}</td>
                  <td className="p-3 font-bold font-mono text-[var(--brand)]">#{log.revision}</td>
                  <td className="p-3 max-w-[320px] truncate text-[var(--text)]">{log.summary}</td>
                  <td className="p-3 text-right font-mono text-[11px] text-[var(--text3)]">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}
