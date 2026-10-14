import { useObservabilityRelated } from '../hooks/useObservabilityApi';
import { JsonViewer } from '@/shared/observe';
import { Skeleton } from '@/shared/skeletons';

export function RelatedTab({ resource, id, relation }: { resource: string; id: string; relation: string }) {
  const { data, isLoading, error } = useObservabilityRelated(resource, id, relation);

  // A tab loads inside an already-rendered page: a few rows in place, never a
  // second page-shaped skeleton.
  if (isLoading) {
    return (
      <div role="status" aria-label={`Loading related ${relation}`} className="flex flex-col gap-2 p-4">
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-8 w-full" delay={row * 30} />
        ))}
      </div>
    );
  }
  if (error) return <div className="p-4 text-[13px] text-[var(--red)]">Failed to load related {relation}.</div>;
  if (!data || data.length === 0) return <div className="p-4 text-[13px] text-[var(--text2)]">No related {relation} found.</div>;

  return <JsonViewer data={data} />;
}
