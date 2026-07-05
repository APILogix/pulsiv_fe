import { useState } from "react";
import { useReleases } from "@/hooks/useDummyData";
import { PageHeader, SectionCard, FilterSelect, StatusBadge, Timestamp, KpiCard } from "@/shared/observe";

export default function ReleaseImpactPage() {
  const { data } = useReleases();
  const releases = data ?? [];
  const [selected, setSelected] = useState("");
  const rel = releases.find((r) => r.id === selected) ?? releases[0];

  const options = [{ value: "", label: "Latest release" }, ...releases.map((r) => ({ value: r.id, label: `${r.version} · ${r.service}` }))];

  if (!rel) return <div className="p-8 text-[var(--text3)]">Loading…</div>;

  const errDelta = Number(rel.errorRateAfter) - Number(rel.errorRateBefore);
  const latDelta = rel.latencyAfter - rel.latencyBefore;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Release Impact" description="Release-aware regression insights with before/after comparison." />

      <div className="flex"><FilterSelect value={selected} onChange={setSelected} options={options} label="Release" /></div>

      <SectionCard>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <code className="font-[family-name:var(--mono)] text-lg font-semibold text-[var(--text)]">{rel.version}</code>
              <StatusBadge status={rel.status} />
            </div>
            <div className="mt-1 text-[12px] text-[var(--text3)]">{rel.service} · {rel.commits} commits · {rel.author} · deployed <Timestamp value={rel.deployedAt} /></div>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Error rate">
          <Compare beforeLabel="Before" before={`${rel.errorRateBefore}%`} after={`${rel.errorRateAfter}%`} delta={errDelta} unit="%" />
        </SectionCard>
        <SectionCard title="p95 latency">
          <Compare beforeLabel="Before" before={`${rel.latencyBefore}ms`} after={`${rel.latencyAfter}ms`} delta={latDelta} unit="ms" />
        </SectionCard>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Apdex change" value={errDelta > 0 ? "-0.04" : "+0.02"} trend={errDelta > 0 ? "down" : "up"} />
        <KpiCard label="New errors" value={errDelta > 0 ? "7" : "0"} />
        <KpiCard label="Affected users" value={errDelta > 0 ? "124" : "0"} />
        <KpiCard label="Verdict" value={rel.status === "regression" ? "Regression" : "Stable"} />
      </div>
    </div>
  );
}

function Compare({ beforeLabel, before, after, delta, unit }: { beforeLabel: string; before: string; after: string; delta: number; unit: string }) {
  const worse = delta > 0;
  return (
    <div className="flex items-center justify-around">
      <div className="text-center">
        <div className="text-[11px] uppercase text-[var(--text3)]">{beforeLabel}</div>
        <div className="text-2xl font-semibold text-[var(--text2)]">{before}</div>
      </div>
      <div className="text-center">
        <div className="text-[11px] uppercase text-[var(--text3)]">After</div>
        <div className="text-2xl font-semibold text-[var(--text)]">{after}</div>
      </div>
      <div className={worse ? "text-[var(--red)]" : "text-[var(--green)]"}>
        <div className="text-[11px] uppercase">Δ</div>
        <div className="text-lg font-semibold">{worse ? "+" : ""}{delta.toFixed(2)}{unit}</div>
      </div>
    </div>
  );
}
