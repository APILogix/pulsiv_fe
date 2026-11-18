import { Link } from "react-router";

import { useObservabilityList } from "@/pages/observe/hooks/useObservabilityApi";
import { PageHeader, SectionCard, Table, Tr, Td, Timestamp } from "@/shared/observe";

interface ReleaseRecord {
  version: string;
  commitSha: string | null;
  branch: string | null;
  environment: string;
  releasedAt: string;
}

export default function ReleaseImpactPage() {
  const { data, isLoading, error, refetch } = useObservabilityList<ReleaseRecord>("releases", { limit: 50 });
  const releases = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Releases" description="Recent deployment markers recorded for this organization or project." />

      <SectionCard title="Release history" className="p-0">
        {isLoading ? (
          <p className="p-5 text-[13px] text-[var(--text3)]">Loading releases…</p>
        ) : error ? (
          <div className="flex items-center justify-between gap-4 p-5">
            <p role="alert" className="text-[13px] text-[var(--red)]">Release history could not be loaded.</p>
            <button type="button" onClick={() => void refetch()} className="text-[13px] font-medium text-[var(--brand)]">Retry</button>
          </div>
        ) : releases.length === 0 ? (
          <div className="p-5">
            <p className="text-[13px] text-[var(--text3)]">No releases were recorded in the current default range.</p>
            <Link to="../observability" className="mt-3 inline-flex text-[13px] font-medium text-[var(--brand)] hover:underline">Open observability</Link>
          </div>
        ) : (
          <Table headers={["Version", "Environment", "Branch", "Commit", "Released at"]}>
            {releases.map((release) => (
              <Tr key={`${release.version}:${release.releasedAt}`}>
                <Td className="font-[family-name:var(--mono)] font-medium">{release.version}</Td>
                <Td className="text-[var(--text2)]">{release.environment}</Td>
                <Td className="text-[var(--text2)]">{release.branch ?? "—"}</Td>
                <Td className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{release.commitSha?.slice(0, 12) ?? "—"}</Td>
                <Td><Timestamp value={release.releasedAt} /></Td>
              </Tr>
            ))}
          </Table>
        )}
      </SectionCard>
    </div>
  );
}
