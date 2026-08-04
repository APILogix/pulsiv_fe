import { useObservabilityRelated } from '../hooks/useObservabilityApi';
import { JsonViewer, DetailSkeleton } from '@/shared/observe';

export function RelatedTab({ resource, id, relation }: { resource: string; id: string; relation: string }) {
  const { data, isLoading, error } = useObservabilityRelated(resource, id, relation);

  if (isLoading) return <DetailSkeleton />;
  if (error) return <div className="p-4 text-red-500">Failed to load related {relation}.</div>;
  if (!data || data.length === 0) return <div className="p-4 text-[var(--text2)]">No related {relation} found.</div>;

  // Render a JSON viewer for the array of related items.
  // In a real app, this might be a table, but for now we render exactly what backend returns.
  return <JsonViewer data={data} />;
}
