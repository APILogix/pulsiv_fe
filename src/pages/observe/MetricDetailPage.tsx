import { useParams } from "react-router";
import ResourceDetailPage from "./detail/ResourceDetailPage";

export default function MetricDetailPage() {
  const { metricId = "" } = useParams();
  return <ResourceDetailPage resource="metrics" id={metricId} />;
}
