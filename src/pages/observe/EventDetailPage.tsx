import { useParams } from "react-router";
import ResourceDetailPage from "./detail/ResourceDetailPage";

export default function EventDetailPage() {
  const { eventId = "" } = useParams();
  return <ResourceDetailPage resource="spans" id={eventId} />;
}
