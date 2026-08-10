import { useParams } from "react-router";
import ResourceDetailPage from "./detail/ResourceDetailPage";

export default function SpanDetailPage() {
  const { spanId = "" } = useParams();
  return <ResourceDetailPage resource="spans" id={spanId} />;
}
