import { useState } from "react";
import { useIncidents } from "@/hooks/useDummyData";
import { PageHeader, SectionCard, FilterSelect, SeverityBadge } from "@/shared/observe";

export default function RootCausePage() {
  const { data } = useIncidents();
  const incidents = data ?? [];
  const [selected, setSelected] = useState("");
  const incident = incidents.find((i) => i.id === selected) ?? incidents[0];

  const options = [{ value: "", label: "Select incident…" }, ...incidents.slice(0, 12).map((i) => ({ value: i.id, label: `${i.id} · ${i.title}` }))];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Root Cause Analysis" description="Automated incident explanation with confidence scoring." />

      <div className="flex"><FilterSelect value={selected} onChange={setSelected} options={options} label="Incident" /></div>

      {incident && (
        <>
          <SectionCard>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SeverityBadge severity={incident.severity} />
                <span className="font-semibold text-[var(--text)]">{incident.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[var(--text3)]">Confidence</span>
                <span className="rounded-full bg-[var(--green-bg)] px-2.5 py-1 text-[13px] font-semibold text-[var(--green)]">91%</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="RCA report">
            <div className="flex flex-col gap-4 text-[13px] leading-relaxed text-[var(--text2)]">
              <div>
                <div className="mb-1 font-semibold text-[var(--text)]">Summary</div>
                The incident on <strong>{incident.service}</strong> was triggered by alert rule "{incident.alertRuleName}". Analysis indicates a correlated deploy event within the same window.
              </div>
              <div>
                <div className="mb-1 font-semibold text-[var(--text)]">Contributing factors</div>
                <ul className="ml-4 list-disc space-y-1">
                  <li>Release v2.1.0 deployed 4 minutes before first error.</li>
                  <li>Database connection pool saturation observed (98% utilization).</li>
                  <li>Elevated p95 latency on dependent <code className="font-[family-name:var(--mono)]">pg.query</code> spans.</li>
                </ul>
              </div>
              <div>
                <div className="mb-1 font-semibold text-[var(--text)]">Recommended actions</div>
                <ul className="ml-4 list-disc space-y-1">
                  <li>Roll back release v2.1.0 or increase pool size to 60.</li>
                  <li>Add a pre-deploy canary check for connection saturation.</li>
                </ul>
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
