import { ReadoutBand } from "@/shared/observe";
import type { ReadoutCell } from "@/shared/observe";
import type { ErrorDetailResponse } from "./types";
import { displayValue } from "./helpers";

export function SummaryCards({ detail }: { detail: ErrorDetailResponse }) {
  const issueId = detail.errorGroup?.publicId ?? detail.related?.errorGroup?.publicId;
  const traceId = detail.trace?.publicId ?? detail.related?.trace?.publicId;
  const handled = detail.error?.handled;
  const severity = String(detail.error?.severity ?? "error").toLowerCase();

  const cells: ReadoutCell[] = [
    { label: "Exception", value: detail.error?.name ?? "Error", sub: "error class", tone: "bad" },
    {
      label: "Handling",
      value: handled == null ? "Unknown" : handled ? "Handled" : "Unhandled",
      sub: handled === false ? "reached the global handler" : handled ? "caught by application code" : "not reported by the SDK",
      tone: handled === false ? "bad" : "neutral",
    },
    {
      label: "Severity",
      value: severity.charAt(0).toUpperCase() + severity.slice(1),
      sub: "reported level",
      tone: severity === "fatal" || severity === "critical" ? "bad" : severity === "warning" ? "warn" : "neutral",
    },
    { label: "Issue", value: displayValue(issueId), sub: issueId ? "fingerprint group" : "not grouped yet" },
    { label: "Trace", value: displayValue(traceId), sub: traceId ? "correlated trace" : "no trace linked" },
  ];

  return <ReadoutBand cells={cells} />;
}
