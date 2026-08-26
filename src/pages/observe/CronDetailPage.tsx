import { useParams } from "react-router";
import ResourceDetailPage from "./detail/ResourceDetailPage";

export default function CronDetailPage() {
  const { checkinId = "" } = useParams();
  return <ResourceDetailPage resource="crons" id={checkinId} />;
}
