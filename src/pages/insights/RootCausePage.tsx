import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";

import { useIncidents } from "@/modules/alerting/hooks/useAlerting";
import type { Incident } from "@/modules/alerting/api/types";
import { PageHeader, SectionCard, FilterSelect, SeverityBadge, StatusBadge, Timestamp } from "@/shared/observe";

export default function RootCausePage() {
  const { data, isLoading, error, refetch } = useIncidents({ limit: 100, sortBy: "lastSeenAt", sortOrder: "desc" });
  const incidents: Incident[] = data?.data ?? [];
  const [selectedId, setSelectedId] = useState("");
  const incident = useMemo(
    () => incidents.find((item) => item.id === selectedId) ?? incidents[0],
    [incidents, selectedId],
  );
  const options = [
    { value: "", label: incidents.length ? "Latest incident" : "No incidents" },
    ...incidents.map((item) => ({ value: item.id, label: `${item.severity.toUpperCase()} · ${item.title}` })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Incident analysis" description="Choose an active or recent incident and review the alert data recorded by the backend." />

      {isLoading ? (
        <SectionCard title="Incidents"><p className="text-[13px] text-[var(--text3)]">Loading incidents…</p></SectionCard>
      ) : error ? (
        <SectionCard title="Incidents">
          <div className="flex items-center justify-between gap-4">
            <p role="alert" className="text-[13px] text-[var(--red)]">Incidents could not be loaded.</p>
            <button type="button" onClick={() => void refetch()} className="text-[13px] font-medium text-[var(--brand)]">Retry</button>
          </div>
        </SectionCard>
      ) : incidents.length === 0 ? (
        <SectionCard title="No incidents"><p className="text-[13px] text-[var(--text3)]">The alerting API has no incidents to analyze.</p></SectionCard>
      ) : (
        <>
          <div className="flex"><FilterSelect value={selectedId} onChange={setSelectedId} options={options} label="Incident" /></div>

          {incident && (
            <>
              <SectionCard title="Incident">
                <div className="flex flex-wrap items-center gap-3">
                  <SeverityBadge severity={incident.severity} />
                  <h2 className="min-w-0 flex-1 text-[15px] font-semibold text-[var(--text)]">{incident.title}</h2>
                  <StatusBadge status={incident.status} />
                </div>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Fact label="Service" value={incident.service ?? "—"} />
                  <Fact label="Route" value={incident.route ?? incident.dimensionKey} mono />
                  <Fact label="Occurrences" value={incident.occurrenceCount.toLocaleString()} />
                  <Fact label="Environment" value={incident.environment ?? "—"} />
                  <Fact label="Observed value" value={incident.observedValue == null ? "—" : String(incident.observedValue)} />
                  <Fact label="Threshold" value={incident.thresholdValue == null ? "—" : String(incident.thresholdValue)} />
                  <Fact label="Started" value={<Timestamp value={incident.startedAt} />} />
                  <Fact label="Last seen" value={<Timestamp value={incident.lastSeenAt} />} />
                </dl>
              </SectionCard>
              <SectionCard title="Grounded AI analysis" description="Incident records do not include the canonical telemetry ID required by the AI investigation API.">
                <p className="text-[13px] leading-relaxed text-[var(--text2)]">
                  To avoid presenting an invented root cause, use the AI investigation page with an error, trace, request, or log Public ID associated with this incident.
                </p>
                <Link to="../ai/investigations" className="mt-4 inline-flex text-[13px] font-medium text-[var(--brand)] hover:underline">
                  Open AI investigations
                </Link>
              </SectionCard>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-[0.08em] text-[var(--text3)]">{label}</dt>
      <dd className={`mt-1 truncate text-[13px] text-[var(--text2)] ${mono ? "font-[family-name:var(--mono)]" : ""}`}>{value}</dd>
    </div>
  );
}
