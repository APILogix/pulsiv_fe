import type { IncidentState } from "../api/types";
import { Pill, type SurfaceTone } from "@/shared/ui/pulse";

interface IncidentStateBadgeProps {
  state: IncidentState | string;
  /** Kept for call-site compatibility; every state renders at pill size. */
  size?: "sm" | "md" | "lg";
}

/**
 * Incident lifecycle state as a sentence-case pill (design/alerting/DESIGN.md).
 * Red means the incident still needs a human, amber means someone has it,
 * green means it is over. Muted and closed recede to neutral.
 */
const STATE: Record<string, { label: string; tone: SurfaceTone; live: boolean }> = {
  healthy: { label: "Healthy", tone: "green", live: false },
  pending: { label: "Pending", tone: "amber", live: true },
  triggered: { label: "Triggered", tone: "red", live: true },
  firing: { label: "Firing", tone: "red", live: true },
  open: { label: "Open", tone: "red", live: true },
  escalated: { label: "Escalated", tone: "red", live: true },
  acknowledged: { label: "Acknowledged", tone: "amber", live: true },
  muted: { label: "Muted", tone: "neutral", live: false },
  silenced: { label: "Silenced", tone: "neutral", live: false },
  suppressed: { label: "Suppressed", tone: "neutral", live: false },
  resolved: { label: "Resolved", tone: "green", live: false },
  closed: { label: "Closed", tone: "neutral", live: false },
};

export function IncidentStateBadge({ state }: IncidentStateBadgeProps) {
  const normalized = (state || "healthy").toLowerCase();
  const conf = STATE[normalized] ?? { label: normalized, tone: "neutral", live: false };
  return (
    <Pill tone={conf.tone} dot={conf.live}>
      {conf.label}
    </Pill>
  );
}
