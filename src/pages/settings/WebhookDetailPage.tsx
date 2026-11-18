import { Navigate, useParams } from "react-router";

/** Preserve legacy webhook links while using the connector detail API. */
export default function WebhookDetailPage() {
  const { webhookId } = useParams();
  if (!webhookId) return <Navigate to="../integrations" replace />;
  return <Navigate to={`../integrations/${encodeURIComponent(webhookId)}`} replace />;
}
