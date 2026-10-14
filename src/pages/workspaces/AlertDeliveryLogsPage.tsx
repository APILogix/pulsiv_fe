import type { ReactNode } from "react";
import { Link } from "react-router";

import { useAlertDeliveries, type AlertDelivery } from "@/modules/projects/hooks/useAlertDeliveries";
import { projectPath } from "@/modules/projects/navigation/project-routes";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  HIDE_BELOW_SM,
  ProjectPageHeader,
  Readouts,
  RowTitle,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  TextLink,
  ToolbarCount,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Pill, type SurfaceTone } from "@/shared/ui/pulse";
import { SeverityBadge, Timestamp, formatLatency, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { useCurrentProject } from "./ProjectShellPage";

// ── module-level constants (rules.md §1.2) ───────────────────

// State colour only: delivered is healthy, in-flight is pending, failed is broken.
const STATUS_TONE: Record<string, SurfaceTone> = {
  delivered: "green",
  sent: "green",
  success: "green",
  pending: "amber",
  queued: "amber",
  retrying: "amber",
  failed: "red",
  dead_letter: "red",
  dead: "red",
};

const IN_FLIGHT = new Set(["pending", "queued", "retrying"]);
const FAILED = new Set(["failed", "dead_letter", "dead"]);
const DELIVERED = new Set(["delivered", "sent", "success"]);

const COLUMNS: SheetColumn[] = [
  { key: "time", header: "Time", className: "w-[112px]" },
  { key: "destination", header: "Destination", className: "w-full" },
  { key: "severity", header: "Severity", className: `w-[112px] ${HIDE_BELOW_MD}` },
  { key: "status", header: "Status", className: "w-[120px]" },
  { key: "attempts", header: "Attempts", align: "right", className: `w-[96px] ${HIDE_BELOW_SM}` },
  { key: "latency", header: "Latency", align: "right", className: `w-[104px] ${HIDE_BELOW_LG}` },
];

function sentenceCase(value: string) {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

// ── page ─────────────────────────────────────────────────────

export default function AlertDeliveryLogsPage() {
  // The project comes from the shell. Project URLs carry the public ID, not
  // the internal UUID the API expects.
  const { projectId, orgSlug, publicId } = useCurrentProject();
  const { data, isLoading, error, refetch } = useAlertDeliveries(projectId);
  const deliveries: AlertDelivery[] = data ?? [];

  const delivered = deliveries.filter((delivery) => DELIVERED.has(delivery.status)).length;
  const failed = deliveries.filter((delivery) => FAILED.has(delivery.status)).length;
  const inFlight = deliveries.filter((delivery) => IN_FLIGHT.has(delivery.status)).length;
  const medianLatency = median(
    deliveries
      .filter((delivery) => DELIVERED.has(delivery.status) && delivery.latency != null)
      .map((delivery) => delivery.latency as number),
  );
  const sampleNote = `Of the latest ${formatNumber(deliveries.length)}`;

  const readouts: Readout[] = [
    { label: "Delivered", value: formatNumber(delivered), sub: sampleNote },
    { label: "Failed", value: formatNumber(failed), sub: sampleNote, tone: failed > 0 ? "bad" : "neutral" },
    {
      label: "In flight",
      value: formatNumber(inFlight),
      sub: "Pending or retrying",
      tone: inFlight > 0 ? "warn" : "neutral",
    },
    {
      label: "Median latency",
      value: medianLatency == null ? "—" : formatLatency(medianLatency),
      sub: "Delivered notifications",
    },
  ];

  const deadLettersPath = projectPath(orgSlug, publicId, "dlq");

  let body: ReactNode;
  if (isLoading) {
    body = <SheetLoading rows={5} label="Loading deliveries" />;
  } else if (error) {
    body = (
      <SheetError title="Could not load the delivery log" message={apiErrorMessage(error)} onRetry={() => void refetch()} />
    );
  } else if (deliveries.length === 0) {
    body = (
      <SheetEmpty
        title="No deliveries yet"
        description="Each notification attempt that a route sends appears here, with its outcome, attempts, and latency."
        action={
          <TextLink to={projectPath(orgSlug, publicId, "routes")} arrow>
            Review routing
          </TextLink>
        }
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Alert deliveries" minWidth={520}>
        {deliveries.map((delivery) => (
          <SheetRow key={delivery.id}>
            <SheetCell>
              <Timestamp value={delivery.timestamp} />
            </SheetCell>
            <SheetCell className="w-full max-w-0">
              <RowTitle title={delivery.routeName} subtitle={sentenceCase(delivery.connectorType)} />
            </SheetCell>
            <SheetCell className={HIDE_BELOW_MD}>
              <SeverityBadge severity={delivery.severity} />
            </SheetCell>
            <SheetCell>
              <Pill tone={STATUS_TONE[delivery.status] ?? "neutral"} dot>
                {sentenceCase(delivery.status)}
              </Pill>
            </SheetCell>
            <SheetCell align="right" className={HIDE_BELOW_SM}>
              <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                {formatNumber(delivery.attempts)}
              </span>
            </SheetCell>
            <SheetCell align="right" className={HIDE_BELOW_LG}>
              <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                {delivery.latency == null ? "—" : formatLatency(delivery.latency)}
              </span>
            </SheetCell>
          </SheetRow>
        ))}
      </SheetTable>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Delivery log"
        description="Every notification attempt for this project's alerts: where it went, whether it arrived, and how long it took."
        actions={
          <UiButton variant="outline" size="lg" asChild>
            <Link to={deadLettersPath}>View dead letters</Link>
          </UiButton>
        }
      />

      <Readouts cells={readouts} loading={isLoading} label="Delivery summary" />

      <Sheet
        label="Alert deliveries"
        toolbar={
          !isLoading && !error && deliveries.length > 0 ? (
            <>
              <span className="text-[12px] text-[var(--text3)]">Newest first. Failed deliveries retry before they reach dead letters.</span>
              <ToolbarCount>
                {formatNumber(deliveries.length)} {deliveries.length === 1 ? "delivery" : "deliveries"}
              </ToolbarCount>
            </>
          ) : undefined
        }
      >
        {body}
      </Sheet>
    </WorkspacePage>
  );
}
