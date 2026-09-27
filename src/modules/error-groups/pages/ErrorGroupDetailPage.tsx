import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useErrorGroupDetail, useErrorGroupsList, useErrorGroupMutations } from "../hooks/useErrorGroups";
import { ErrorGroupHeader } from "../components/ErrorGroupHeader";
import { ErrorOverviewCards } from "../components/ErrorOverviewCards";
import { OccurrenceChart } from "../components/OccurrenceChart";
import { LatestEventCard } from "../components/LatestEventCard";
import { HistoryTimeline } from "../components/HistoryTimeline";
import { RegressionBanner } from "../components/RegressionBanner";
import { RelatedEventsTable } from "../components/RelatedEventsTable";
import { AskAICard } from "../components/AskAICard";
import { MergeDialog } from "../components/MergeDialog";
import { ResolveDialog } from "../components/ResolveDialog";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/shared/observe";
import { DetailSkeleton } from "@/shared/skeletons";

export default function ErrorGroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);

  const { group, history, relatedEvents, isLoading, refetch } = useErrorGroupDetail(groupId ?? "");
  const { groups: allGroups } = useErrorGroupsList({
    status: "",
    severity: "",
    isRegression: "",
    environment: "",
    release: "",
    sdkVersion: "",
    appVersion: "",
    minOccurrences: "",
    search: "",
  });
  const { updateStatus, mergeGroups } = useErrorGroupMutations();

  if (isLoading && !group) {
    return (
      <div className="mx-auto w-full max-w-[1360px] px-6 py-6">
        <DetailSkeleton />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-6 py-8">
        <Button variant="ghost" className="w-fit gap-2" onClick={() => navigate("/observability/error-groups")}>
          <ArrowLeft className="size-4" />
          Back to Error Groups
        </Button>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg1)] px-8 py-16 text-center shadow-xs">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--red-bg)] text-[var(--red)]">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="mt-4 text-[18px] font-semibold text-[var(--text)]">Error Group Not Found</h2>
          <p className="mt-2 text-[13.5px] text-[var(--text3)]">The requested error group does not exist or has been removed.</p>
          <div className="mt-6">
            <Button variant="primary" onClick={() => navigate("/observability/error-groups")}>
              Back to Error Groups
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-8 px-6 py-6 pb-28">
      {/* Back navigation */}
      <Button variant="ghost" className="w-fit gap-2" onClick={() => navigate("/observability/error-groups")}>
        <ArrowLeft className="size-4" />
        Back to Error Groups
      </Button>

      {/* Header */}
      <ErrorGroupHeader
        group={group}
        onResolve={() => setIsResolveOpen(true)}
        onIgnore={() => setIsResolveOpen(true)}
        onMerge={() => setIsMergeOpen(true)}
      />

      {/* Active Regression Banner */}
      <RegressionBanner group={group} />

      {/* Overview KPI Cards */}
      <ErrorOverviewCards group={group} />

      {/* Occurrence Trend Graph (24h/7d/30d) */}
      <OccurrenceChart group={group} />

      {/* Latest Event Sample & Stack Trace */}
      <LatestEventCard group={group} />

      {/* AI Investigation Section */}
      <AskAICard group={group} />

      {/* Related Events Table */}
      <RelatedEventsTable events={relatedEvents} />

      {/* Audit History Timeline */}
      <HistoryTimeline history={history} />

      {/* Dialog Modals */}
      <ResolveDialog
        isOpen={isResolveOpen}
        onClose={() => setIsResolveOpen(false)}
        group={group}
        onConfirm={async (st, reason) => {
          await updateStatus(group.id, st, reason);
          refetch();
        }}
      />

      <MergeDialog
        isOpen={isMergeOpen}
        onClose={() => setIsMergeOpen(false)}
        currentGroup={group}
        allGroups={allGroups}
        onMerge={async (targetId) => {
          await mergeGroups(group.id, targetId);
          refetch();
        }}
      />
    </div>
  );
}

