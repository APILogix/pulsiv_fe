import { useNavigate } from "react-router";
import { Radio, BookOpen, ExternalLink } from "lucide-react";
import { useTimeRangeStore } from "@/stores/timeRangeStore";
import {
  useRequestSummary,
  useStatusDistribution,
  useEndpointsAnalytics,
} from "@/modules/analytics";
import {
  PageHeader, SectionCard,
  Table, Tr, Td, MonospaceText,
  formatCompact, formatLatency,
} from "@/shared/observe";
import { AnimatedEmptyState } from "@/shared/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Donut, ChartCard, HeroBand, ZoneLabel } from "./widgets";

export default function RealtimeTraffic() {
  const navigate = useNavigate();
  const isLive = useTimeRangeStore((s) => s.isLive);
  const toggleLive = useTimeRangeStore((s) => s.toggleLive);

  const { data: summaryRes, isLoading: isSummaryLoading } = useRequestSummary({ window: "1m" });
  const { data: statusRes, isLoading: isStatusLoading } = useStatusDistribution({ window: "1m" });
  const { data: endpointsRes, isLoading: isEndpointsLoading } = useEndpointsAnalytics({ window: "1m", limit: 10 });

  const isLoading = isSummaryLoading || isStatusLoading || isEndpointsLoading;

  const cards = summaryRes?.data?.cards ?? [];
  const reqCard = cards.find((c) => c.key === "requests.total");
  const errCard = cards.find((c) => c.key === "requests.error_rate");
  const p50Card = cards.find((c) => c.key === "requests.latency_p50");
  const p95Card = cards.find((c) => c.key === "requests.latency_p95");
  const rateLimitCard = cards.find((c) => c.key === "requests.rate_limited_count");

  const totalReq = reqCard?.value ?? 0;
  const p50 = p50Card?.value ?? 0;
  const p95 = p95Card?.value ?? 0;
  const errorRate = errCard?.value ?? 0;
  const rateLimitHits = rateLimitCard?.value ?? 0;

  const distribution = statusRes?.data?.distribution ?? [];
  const statusSegments = [
    { label: "2xx Success", value: distribution.find((d) => d.class === "2xx")?.count ?? 0, color: "var(--green)" },
    { label: "3xx Redirect", value: distribution.find((d) => d.class === "3xx")?.count ?? 0, color: "var(--blue)" },
    { label: "4xx Client", value: distribution.find((d) => d.class === "4xx")?.count ?? 0, color: "var(--amber)" },
    { label: "5xx Server", value: distribution.find((d) => d.class === "5xx")?.count ?? 0, color: "var(--red)" },
  ].filter((s) => s.value > 0);

  const topRoutes = endpointsRes?.data?.table?.rows ?? [];

  if (isLoading) {
    return <RealtimeTrafficSkeleton isLive={isLive} toggleLive={toggleLive} />;
  }

  if (!isLoading && totalReq === 0 && topRoutes.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <PageHeader
          title="Real-Time Traffic & Request Flow"
          description="Know exactly what is happening right now across all APIs · updates continuously."
          actions={
            <button
              type="button"
              onClick={toggleLive}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-sm font-medium text-[var(--text)]"
            >
              <span className={`size-2 rounded-full ${isLive ? "pulse-dot bg-[var(--green)]" : "bg-[var(--green)]"}`} />
              Live (1m window)
            </button>
          }
        />
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-8">
          <AnimatedEmptyState
            illustration="dashboard"
            title="Listening for Real-Time Traffic"
            description="No live requests detected in the current 1-minute window. Ingest requests via the SDK or OpenTelemetry collector to view live streams."
            action={
              <button
                type="button"
                onClick={() => navigate("/settings/quickstart")}
                className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-[var(--bg)] transition hover:opacity-90"
              >
                <BookOpen className="size-4" />
                SDK Quickstart
              </button>
            }
            secondaryAction={
              <button
                type="button"
                onClick={() => navigate("/observability/requests")}
                className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-2 text-[13px] font-medium text-[var(--text)] transition hover:bg-[var(--bg3)]"
              >
                <ExternalLink className="size-4" />
                Explore Historical Requests
              </button>
            }
            hint="Live polling is active (1m rolling window). Telemetry sent with your API key will appear in sub-second intervals."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <PageHeader
        title="Real-Time Traffic & Request Flow"
        description="Know exactly what is happening right now across all APIs · updates every 15s."
        actions={
          <button
            type="button"
            onClick={toggleLive}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-sm font-medium text-[var(--text)]"
          >
            <span className={`size-2 rounded-full ${isLive ? "pulse-dot bg-[var(--green)]" : "bg-[var(--green)]"}`} />
            Live (1m window)
          </button>
        }
      />

      <HeroBand
        metrics={[
          { label: "Total requests", value: formatCompact(totalReq), delta: "Live rollups", trend: "neutral", sparkColor: "var(--green)" },
          { label: "Rate-limit (429)", value: formatCompact(rateLimitHits), delta: rateLimitHits > 0 ? "Rate limited" : "Nominal", trend: rateLimitHits > 0 ? "down" : "up", sparkColor: "var(--amber)" },
          { label: "Error rate (5xx)", value: `${errorRate.toFixed(2)}%`, delta: "Error ratio", trend: errorRate > 1 ? "down" : "up", sparkColor: "var(--red)" },
          { label: "P50 latency", value: formatLatency(p50), delta: "Median", trend: "neutral", sparkColor: "var(--blue)" },
          { label: "P95 latency", value: formatLatency(p95), delta: "Tail", trend: "neutral", sparkColor: "var(--violet)" },
        ]}
      />

      <ZoneLabel>Live pulse</ZoneLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Real-time request metrics"
          action={<Radio className="size-4 text-[var(--green)]" />}
          headline={`${formatCompact(totalReq)} total`}
          headlineLabel="in current 1m bucket"
          timeAxis="Last 1 minute"
        >
          <div className="flex flex-col justify-center py-6 gap-2">
            <div className="text-3xl font-bold font-mono text-[var(--brand)]">{totalReq.toLocaleString()} requests</div>
            <div className="text-xs text-[var(--text3)]">Pre-aggregated from 1-minute partitioned rollups with sub-10ms query latency.</div>
          </div>
        </ChartCard>

        <ChartCard
          title="Status code distribution"
          legend={statusSegments.map((s) => ({ label: s.label, color: s.color }))}
        >
          <Donut
            segments={statusSegments.length > 0 ? statusSegments : [{ label: "2xx", value: 1, color: "var(--green)" }]}
            centerLabel={formatCompact(totalReq)}
            centerSub="req"
            size={140}
          />
        </ChartCard>
      </div>

      <ZoneLabel>Hot paths</ZoneLabel>

      <SectionCard title="Top active endpoints (1m)">
        <Table headers={["#", "Endpoint", "Requests", "Error %", "P50", "P95", "Bytes Out"]}>
          {topRoutes.length === 0 ? (
            <Tr>
              <Td>—</Td>
              <Td><span className="text-[var(--text3)]">No endpoint traffic in the current window</span></Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
            </Tr>
          ) : (
            topRoutes.map((r, i) => (
              <Tr key={r.endpoint} onClick={() => navigate("/observability/requests")}>
                <Td className="w-8 tabular-nums text-[var(--text3)]">{i + 1}</Td>
                <Td><MonospaceText value={r.endpoint} className="max-w-[320px]" /></Td>
                <Td className="tabular-nums font-semibold">{formatCompact(r.requests)}</Td>
                <Td className="tabular-nums">{(r.errorRatePct ?? 0).toFixed(1)}%</Td>
                <Td className="tabular-nums">{r.p50Ms ? formatLatency(r.p50Ms) : "—"}</Td>
                <Td className="tabular-nums">{r.p95Ms ? formatLatency(r.p95Ms) : "—"}</Td>
                <Td className="tabular-nums font-mono text-[11px]">{r.bytesOut.toLocaleString()} B</Td>
              </Tr>
            ))
          )}
        </Table>
      </SectionCard>
    </div>
  );
}

function RealtimeTrafficSkeleton({ isLive, toggleLive }: { isLive: boolean; toggleLive: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 animate-in fade-in duration-300">
      <PageHeader
        title="Real-Time Traffic & Request Flow"
        description="Know exactly what is happening right now across all APIs · updates continuously."
        actions={
          <button
            type="button"
            onClick={toggleLive}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-sm font-medium text-[var(--text)]"
          >
            <span className={`size-2 rounded-full ${isLive ? "pulse-dot bg-[var(--green)]" : "bg-[var(--green)]"}`} />
            Live (1m window)
          </button>
        }
      />

      <div className="grid grid-cols-2 divide-[var(--border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] max-lg:gap-px max-lg:bg-[var(--border)] lg:grid-cols-none lg:auto-cols-fr lg:grid-flow-col lg:divide-x">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-2 bg-[var(--bg1)] px-5 py-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      <ZoneLabel>Live pulse</ZoneLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
          <Skeleton className="mb-4 h-4 w-44" />
          <div className="flex flex-col justify-center py-6 gap-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>
        </div>

        <div className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
          <Skeleton className="mb-4 h-4 w-44" />
          <div className="flex items-center justify-center py-6">
            <Skeleton className="size-36 rounded-full" />
          </div>
        </div>
      </div>

      <ZoneLabel>Hot paths</ZoneLabel>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
        <Skeleton className="mb-4 h-4 w-48" />
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-3 last:border-b-0">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
