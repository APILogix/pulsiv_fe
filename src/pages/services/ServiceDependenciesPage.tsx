import { PageHeader, SectionCard } from "@/shared/observe";
import { GitFork, Info } from "lucide-react";

export default function ServiceDependenciesPage() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader 
        title="Service Dependencies" 
        description="Visual map of downstream and upstream service call paths, network hops, and performance impact."
      />

      <div className="flex items-center gap-2.5 rounded-[10px] border border-[var(--brand)]/20 bg-[var(--brand-bg)] px-4 py-3 text-[13px] text-[var(--brand)]">
        <Info className="size-4 shrink-0" />
        Interactive dependency mapping is currently available for services reporting through distributed tracing SDKs.
      </div>

      <SectionCard className="flex flex-col items-center justify-center min-h-[400px] border-dashed">
        <div className="flex size-14 items-center justify-center rounded-full bg-[var(--bg3)] text-[var(--text2)] mb-4 animate-pulse">
          <GitFork className="size-7" />
        </div>
        <h3 className="font-semibold text-base text-[var(--text)]">Telemetry graph loading...</h3>
        <p className="text-sm text-[var(--text3)] mt-1 max-w-sm text-center">
          Pulse is constructing the active connection topology from your service mesh traffic logs.
        </p>
      </SectionCard>
    </div>
  );
}
