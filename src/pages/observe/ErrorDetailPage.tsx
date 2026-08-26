import { useParams } from "react-router";
import { ErrorDetailView } from "./error-detail";

export default function ErrorDetailPage() {
  const { fingerprint = "", eventId } = useParams();
  const errorId = eventId ?? fingerprint;
  return <ErrorDetailView errorId={errorId} />;
}

