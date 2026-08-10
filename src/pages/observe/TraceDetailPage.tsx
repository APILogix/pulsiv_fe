import { useParams } from "react-router";
import ResourceDetailPage from "./detail/ResourceDetailPage";

export default function TraceDetailPage() {
  const { traceId = "" } = useParams();
  return <ResourceDetailPage resource="traces" id={traceId} />;
}
