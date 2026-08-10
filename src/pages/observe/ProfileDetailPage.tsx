import { useParams } from "react-router";
import ResourceDetailPage from "./detail/ResourceDetailPage";

export default function ProfileDetailPage() {
  const { profileId = "" } = useParams();
  return <ResourceDetailPage resource="profiles" id={profileId} />;
}
