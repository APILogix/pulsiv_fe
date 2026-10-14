import { useState } from "react";
import { useParams } from "react-router";
import { DetailNotFound, DetailPage, DetailSkeleton } from "@/shared/observe";
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

const ALL_FILTERS = {
  status: "", severity: "", isRegression: "", environment: "", release: "",
  sdkVersion: "", appVersion: "", minOccurrences: "", search: "",
};

export default function ErrorGroupDetailPage() {
  const { groupId = "" } = useParams<{ groupId: string }>();
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);

  const { group, history, relatedEvents, isLoading, refetch } = useErrorGroupDetail(groupId);
  const { groups: allGroups } = useErrorGroupsList(ALL_FILTERS);
  const { updateStatus, mergeGroups } = useErrorGroupMutations();

  if (isLoading && !group) {
    return (
      <DetailPage>
        <DetailSkeleton />
      </DetailPage>
    );
  }

  if (!group) {
    return <DetailNotFound kind="Error group" id={decodeURIComponent(groupId)} backTo="/observability/error-groups" backLabel="Error groups" />;
  }

  return (
    <DetailPage>
      <ErrorGroupHeader
        group={group}
        onResolve={() => setIsResolveOpen(true)}
        onIgnore={() => setIsResolveOpen(true)}
        onMerge={() => setIsMergeOpen(true)}
      />
      <RegressionBanner group={group} />
      <ErrorOverviewCards group={group} />
      <OccurrenceChart group={group} />
      <LatestEventCard group={group} />
      <RelatedEventsTable events={relatedEvents} />
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <AskAICard group={group} />
        <HistoryTimeline history={history} />
      </div>

      <ResolveDialog
        isOpen={isResolveOpen}
        onClose={() => setIsResolveOpen(false)}
        group={group}
        onConfirm={async (st, reason) => {
          await updateStatus(group.publicId ?? group.id, st, reason);
          refetch();
        }}
      />
      <MergeDialog
        isOpen={isMergeOpen}
        onClose={() => setIsMergeOpen(false)}
        currentGroup={group}
        allGroups={allGroups}
        onMerge={async (targetId) => {
          await mergeGroups(group.publicId ?? group.id, targetId);
          refetch();
        }}
      />
    </DetailPage>
  );
}
