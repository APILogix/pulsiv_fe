import { useParams } from "react-router";
import { RequestDetailView } from "./request-detail/RequestDetailView";

export default function RequestDetailPage() {
  const { requestId = "" } = useParams();
  return <RequestDetailView requestId={requestId} />;
}
