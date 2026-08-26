import { useParams } from "react-router";
import ResourceDetailPage from "./detail/ResourceDetailPage";

export default function LogDetailPage() {
  const { eventId = "" } = useParams();
  return <ResourceDetailPage resource="logs" id={eventId} />;
}
