import { useParams } from "react-router";
import { TraceDetailView } from "./trace-detail/TraceDetailView";

export default function TraceDetailPage() {
  const { traceId = "" } = useParams();
  return <TraceDetailView traceId={traceId} />;
}
