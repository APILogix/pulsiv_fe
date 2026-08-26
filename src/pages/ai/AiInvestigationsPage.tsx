import { useState } from "react";
import {
  Bug,
  ListTree,
  ArrowLeftRight,
  ScrollText,
  Loader2,
  Play,
  PanelRight,
  FlaskConical,
} from "lucide-react";
import { PageHero, Panel, SegmentedControl, fieldInputClass } from "@/shared/ui/pulse";
import { Button } from "@/shared/observe";
import { AiErrorState } from "@/modules/ai/components/states";
import { InvestigationResult } from "@/modules/ai/components/InvestigationResult";
import { aiApi } from "@/modules/ai/api/ai.api";
import { useActiveOrgId, useInvestigation } from "@/modules/ai/hooks/useAi";
import { useAiDrawerStore } from "@/modules/ai/store/ai-drawer.store";
import type { InvestigationResource } from "@/modules/ai/types";

const RESOURCES: { value: InvestigationResource; label: string; icon: typeof Bug; placeholder: string }[] = [
  { value: "error", label: "Error", icon: Bug, placeholder: "e.g. ERR-000000001 or err_01JXYZ..." },
  { value: "trace", label: "Trace", icon: ListTree, placeholder: "e.g. TRC-000000001 or trace_01JXYZ..." },
  { value: "request", label: "Request", icon: ArrowLeftRight, placeholder: "e.g. REQ-000000001 or req_01JXYZ..." },
  { value: "logs", label: "Logs", icon: ScrollText, placeholder: "e.g. LOG-000000001 or log_01JXYZ..." },
];

export default function AiInvestigationsPage() {
  const orgId = useActiveOrgId();
  const investigation = useInvestigation();
  const openInvestigateDrawer = useAiDrawerStore((s) => s.openInvestigate);

  const [resource, setResource] = useState<InvestigationResource>("error");
  const [publicId, setPublicId] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const activeMeta = RESOURCES.find((r) => r.value === resource) ?? RESOURCES[0];

  const handleRun = () => {
    const trimmed = publicId.trim();
    if (!trimmed) {
      setInputError("Please enter a canonical Public ID to investigate.");
      return;
    }
    setInputError(null);
    investigation.mutate({ resource, publicId: trimmed });
  };

  const handleOpenInDrawer = () => {
    const trimmed = publicId.trim();
    openInvestigateDrawer(trimmed ? { resourceType: resource, publicId: trimmed } : undefined);
  };

  const handleFeedback = async (helpful: boolean) => {
    if (!orgId || !investigation.data) return;
    await aiApi.submitFeedback(orgId, investigation.data.request_id, { helpful });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHero
        title="AI Root Cause Analysis"
        description="Provide a canonical resource reference. The backend automatically retrieves and correlates surrounding telemetry to determine the root cause."
        eyebrow="Grounded Analysis"
        actions={
          <Button
            variant="secondary"
            onClick={handleOpenInDrawer}
            className="gap-2 text-[12.5px] border-[var(--ai)]/30 text-[var(--ai)] hover:bg-[var(--ai-bg)]"
          >
            <PanelRight className="size-4" />
            Open AI Drawer
          </Button>
        }
      />

      {/* Input Form — strictly constrained to Dual-Width max-w-[680px] */}
      <div className="w-full max-w-[680px]">
        <Panel
          title="What are you investigating?"
          description="Select the resource type and enter its canonical Public ID."
        >
          <div className="flex flex-col gap-5 pt-2">
            <label className="flex flex-col gap-2">
              <span className="text-[12px] font-medium text-[var(--text2)]">Resource Type</span>
              <SegmentedControl
                ariaLabel="Investigation resource"
                value={resource}
                onChange={(v) => {
                  setResource(v);
                  setInputError(null);
                }}
                options={RESOURCES}
                className="w-full"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--text2)]">Public ID</span>
              <input
                className={`${fieldInputClass} font-[family-name:var(--mono)] text-[13px]`}
                value={publicId}
                onChange={(e) => {
                  setPublicId(e.target.value);
                  setInputError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRun();
                }}
                placeholder={activeMeta.placeholder}
                autoFocus
              />
              {inputError ? (
                <p className="text-[11.5px] text-[var(--red)]">{inputError}</p>
              ) : (
                <p className="text-[11px] text-[var(--text3)]">
                  Enter the public ID format (e.g. <span className="font-[family-name:var(--mono)]">{activeMeta.value === 'error' ? 'ERR-000000001' : activeMeta.value === 'trace' ? 'TRC-000000001' : activeMeta.value === 'request' ? 'REQ-000000001' : 'LOG-000000001'}</span>)
                </p>
              )}
            </label>

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
              <span className="text-[11.5px] text-[var(--text3)]">
                AI correlates error groups, traces, requests, and stack frames
              </span>
              <Button
                variant="primary"
                onClick={handleRun}
                disabled={investigation.isPending || !publicId.trim()}
                className="min-w-[140px] justify-center"
              >
                {investigation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Investigating…
                  </>
                ) : (
                  <>
                    <Play className="size-4" /> Run Investigation
                  </>
                )}
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      {/* Results View — expands for rich telemetry density */}
      {investigation.isPending && (
        <div className="w-full max-w-[1100px] flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] px-6 py-20 text-center shadow-sm">
          <div className="flex size-14 items-center justify-center rounded-full bg-[var(--ai-bg)] text-[var(--ai)] animate-pulse">
            <FlaskConical className="size-7" />
          </div>
          <div className="flex flex-col gap-1 max-w-[400px]">
            <h3 className="text-[15px] font-semibold text-[var(--text)]">Analyzing Telemetry Context</h3>
            <p className="text-[12.5px] text-[var(--text3)] leading-relaxed">
              Correlating trace critical paths, correlated logs, error stack frames, and service dependencies for{" "}
              <code className="font-[family-name:var(--mono)] text-[var(--text)]">{publicId}</code>
            </p>
          </div>
        </div>
      )}

      {investigation.isError && (
        <div className="w-full max-w-[1100px]">
          <AiErrorState error={investigation.error} onRetry={handleRun} />
        </div>
      )}

      {investigation.data && (
        <div className="w-full max-w-[1200px] flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--text)]">Root Cause Analysis</h2>
              <p className="text-[12px] text-[var(--text3)]">
                Grounded investigation results for {resource.toUpperCase()} {publicId}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleOpenInDrawer}
              className="gap-1.5 text-[12px]"
            >
              <PanelRight className="size-3.5" />
              Continue in Drawer
            </Button>
          </div>
          <InvestigationResult answer={investigation.data} onFeedback={handleFeedback} />
        </div>
      )}
    </div>
  );
}
