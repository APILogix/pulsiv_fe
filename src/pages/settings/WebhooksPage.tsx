import { Navigate } from "react-router";

/** Webhook destinations are managed as organization connectors. */
export default function WebhooksPage() {
  return <Navigate to="../integrations" replace />;
}
