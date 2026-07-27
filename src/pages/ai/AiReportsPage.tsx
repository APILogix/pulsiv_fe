import { useState } from "react";
import {
  CalendarClock,
  Download,
  FileBarChart,
  FileJson,
  FileText,
  Loader2,
  Printer,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  PageHero,
  Panel,
  Pill,
  SegmentedControl,
  EmptyPanel,
  fieldTextareaClass,
  type SurfaceTone,
} from "@/shared/ui/pulse";
import { Button, Timestamp } from "@/shared/observe";
import { AiErrorState, AiLoadingBlock } from "@/modules/ai/components/states";
import { InvestigationResult } from "@/modules/ai/components/InvestigationResult";
import { useActiveOrgId, useCreateReport, useReportJob } from "@/modules/ai/hooks/useAi";
import { useReportsStore } from "@/modules/ai/store/reports.store";
import { answerToMarkdown, downloadFile } from "@/modules/ai/lib/export";
import type { AiAnswer, ReportKind } from "@/modules/ai/types";

const REPORT_TYPES: { value: ReportKind; label: string; icon: typeof FileBarChart }[] = [
  { value: "weekly", label: "Weekly", icon: CalendarClock },
  { value: "incident", label: "Incident", icon: ShieldAlert },
  { value: "executive", label: "Executive", icon: FileBarChart },
];

const TITLES: Record<ReportKind, string> = {
  weekly: "Weekly reliability report",
  incident: "Incident report",
  executive: "Executive summary",
};

function statusTone(status: string): SurfaceTone {
  const s = status.toLowerCase();
  if (["succeeded", "completed"].includes(s)) return "green";
  if (["failed", "cancelled"].includes(s)) return "red";
  return "amber";
}

function extractAnswer(job: { result?: AiAnswer | null; answer?: AiAnswer | null } | undefined): AiAnswer | null {
  return job?.result ?? job?.answer ?? null;
}

export default function AiReportsPage() {
  const orgId = useActiveOrgId();
  const create = useCreateReport();
  const store = useReportsStore();
  const records = orgId ? store.records.filter((r) => r.orgId === orgId) : [];

  const [kind, setKind] = useState<ReportKind>("weekly");
  const [notes, setNotes] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const job = useReportJob(activeJobId, true);
  const jobStatus = String(job.data?.status ?? "").toLowerCase();
  const jobDone = ["succeeded", "completed", "failed", "cancelled"].includes(jobStatus);
  const answer = extractAnswer(job.data ?? undefined);

  const activeRecord = records.find((r) => r.jobId === activeJobId) ?? null;

  const handleGenerate = () => {
    if (!orgId) return;
    create.mutate(
      { kind, query: notes },
      {
        onSuccess: (created) => {
          store.add({
            jobId: created.jobId,
            kind,
            title: TITLES[kind],
            createdAt: Date.now(),
            orgId,
          });
          setActiveJobId(created.jobId);
          setNotes("");
          toast.success("Report queued");
        },
        onError: () => toast.error("Couldn't queue the report"),
      },
    );
  };

  const handleExportMarkdown = () => {
    if (!answer || !activeRecord) return;
    downloadFile(
      `${activeRecord.kind}-report-${activeRecord.jobId.slice(0, 8)}.md`,
      answerToMarkdown(activeRecord.title, answer),
      "text/markdown",
    );
  };

  const handleExportJson = () => {
    if (!answer || !activeRecord) return;
    downloadFile(
      `${activeRecord.kind}-report-${activeRecord.jobId.slice(0, 8)}.json`,
      JSON.stringify(answer, null, 2),
      "application/json",
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Artificial Intelligence"
        title="AI Reports"
        description="Generate weekly reliability, incident, and executive reports from your monitoring data. Track history and export any report."
        icon={FileBarChart}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* Generate + history */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
          <Panel title="Generate a report" icon={Sparkles} tone="ai">
            <div className="flex flex-col gap-4">
              <SegmentedControl
                ariaLabel="Report type"
                value={kind}
                onChange={setKind}
                options={REPORT_TYPES}
                className="w-full"
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-[var(--text2)]">
                  Focus / notes <span className="text-[var(--text3)]">(optional)</span>
                </span>
                <textarea
                  className={fieldTextareaClass}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Focus on the payments service and last week's deploy."
                />
              </label>
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={create.isPending || !orgId}
                className="w-full justify-center"
              >
                {create.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Queuing…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" /> Generate {kind} report
                  </>
                )}
              </Button>
              {create.isError && <AiErrorState error={create.error} />}
            </div>
          </Panel>

          <Panel title="History" icon={CalendarClock}>
            {records.length === 0 ? (
              <p className="py-4 text-center text-[12.5px] text-[var(--text3)]">
                Reports you generate appear here.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--border)]">
                {records.map((r) => (
                  <li key={r.jobId} className="flex items-center gap-2 py-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveJobId(r.jobId)}
                      className={`flex min-w-0 flex-1 items-center gap-2 text-left ${
                        r.jobId === activeJobId ? "text-[var(--text)]" : "text-[var(--text2)]"
                      }`}
                    >
                      <FileText className="size-3.5 shrink-0 text-[var(--text3)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px]">{r.title}</span>
                        <span className="text-[11px] text-[var(--text3)]">
                          <Timestamp value={r.createdAt} />
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        store.remove(r.jobId);
                        if (activeJobId === r.jobId) setActiveJobId(null);
                      }}
                      className="text-[var(--text3)] transition-colors hover:text-[var(--red)]"
                      aria-label="Remove from history"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Report viewer */}
        <div className="min-w-0">
          {!activeJobId ? (
            <EmptyPanel
              icon={FileBarChart}
              title="No report selected"
              description="Generate a new report or pick one from your history to view it here."
            />
          ) : job.isLoading && !job.data ? (
            <AiLoadingBlock rows={4} />
          ) : job.isError ? (
            <AiErrorState error={job.error} onRetry={() => job.refetch()} />
          ) : !jobDone ? (
            <Panel title="Preparing report" icon={Loader2} tone="ai">
              <div className="flex items-center gap-3 text-[13px] text-[var(--text2)]">
                <Loader2 className="size-4 animate-spin text-[var(--ai)]" />
                <span>
                  Status: <Pill tone={statusTone(jobStatus || "queued")}>{jobStatus || "queued"}</Pill> · this
                  updates automatically.
                </span>
              </div>
            </Panel>
          ) : jobStatus === "failed" || jobStatus === "cancelled" ? (
            <Panel title="Report unavailable" icon={ShieldAlert} tone="red">
              <p className="text-[13px] text-[var(--text2)]">
                {job.data?.error || "This report could not be generated. Try again."}
              </p>
            </Panel>
          ) : answer ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Pill tone="green">Ready</Pill>
                  <span className="text-[13px] font-semibold text-[var(--text)]">{activeRecord?.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={handleExportMarkdown}>
                    <Download className="size-4" /> Markdown
                  </Button>
                  <Button variant="secondary" onClick={handleExportJson}>
                    <FileJson className="size-4" /> JSON
                  </Button>
                  <Button variant="ghost" onClick={() => window.print()}>
                    <Printer className="size-4" /> Print
                  </Button>
                </div>
              </div>
              <InvestigationResult answer={answer} />
            </div>
          ) : (
            <EmptyPanel
              icon={FileBarChart}
              title="Report completed"
              description="The job finished but returned no content."
            />
          )}
        </div>
      </div>
    </div>
  );
}
