import { useEndpoints } from "@/hooks/useDummyData";
import { PageHeader, SectionCard, StatusBadge, MethodBadge, CopyButton, formatCompact } from "@/shared/observe";

export default function ApiEndpointsPage() {
  const { data } = useEndpoints();
  const endpoints = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="API Endpoints" description="Public ingestion endpoint references with usage examples." />

      <div className="flex flex-col gap-3">
        {endpoints.map((e) => (
          <SectionCard key={e.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MethodBadge method={e.method} />
                <code className="font-[family-name:var(--mono)] text-sm text-[var(--text)]">{e.path}</code>
                <StatusBadge status={e.status} />
              </div>
              <div className="flex items-center gap-4 text-[12px] text-[var(--text3)]">
                <span>p95 {e.p95Latency}ms</span>
                <span>{formatCompact(e.requests24h)} / 24h</span>
                <span>{e.errorRate}% err</span>
              </div>
            </div>
            <div className="mt-3 text-[13px] font-medium text-[var(--text2)]">{e.name}</div>
            <div className="relative mt-2 rounded-[8px] border border-[var(--border)] bg-[var(--bg)]">
              <div className="absolute right-2 top-2"><CopyButton value={e.curl} /></div>
              <pre className="overflow-x-auto p-3 pr-20 font-[family-name:var(--mono)] text-[12px] leading-relaxed text-[var(--text2)]"><code>{e.curl}</code></pre>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
