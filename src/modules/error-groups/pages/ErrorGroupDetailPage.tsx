import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { FillPage } from "@/shared/observe";
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
import { AlertCircle, RefreshCw } from "lucide-react";

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

  if (isLoading) {
    return (
      <FillPage className="items-center justify-center">
        <div className="flex items-center gap-2 text-[14px] text-[var(--text2)]">
          <RefreshCw className="size-5 animate-spin text-[var(--brand)]" />
          Loading Error Group details...
        </div>
      </FillPage>
    );
  }

  if (!group) {
    return (
      <FillPage className="items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="size-10 text-[var(--red)]" />
          <h2 className="text-[18px] font-semibold text-[var(--text)]">Error Group Not Found</h2>
          <p className="text-[13px] text-[var(--text2)]">The requested error group does not exist or has been removed.</p>
          <button
            type="button"
            onClick={() => navigate("/observability/error-groups")}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-[13px] font-medium text-[var(--bg)]"
          >
            <RefreshCw className="size-4" />
            Back to Error Groups
          </button>
        </div>
      </FillPage>
    );
  }

  return (
    <FillPage className="space-y-6 sidebar-scroll overflow-y-auto pb-12">
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
    </FillPage>
  );
}
