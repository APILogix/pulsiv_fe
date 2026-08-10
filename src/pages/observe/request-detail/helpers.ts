import type { NormalizedAiResponse, RequestSectionId } from "./types";

export const REQUEST_SECTIONS: { id: RequestSectionId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "http", label: "HTTP" },
  { id: "performance", label: "Performance" },
  { id: "context", label: "Context" },
  { id: "metadata", label: "Metadata" },
  { id: "ai", label: "AI" },
  { id: "related", label: "Related" },
  { id: "tags", label: "Tags" },
  { id: "developer-tools", label: "Developer Tools" },
];

export function sectionDomId(id: RequestSectionId): string {
  return `request-section-${id}`;
}

export function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function hasJsonValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

export function normalizeAiResponse(raw: unknown): NormalizedAiResponse | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const recommendations = Array.isArray(o.recommendations)
    ? o.recommendations.filter((item): item is string => typeof item === "string")
    : Array.isArray(o.findings)
      ? o.findings.filter((item): item is string => typeof item === "string")
      : [];
  const confidence =
    typeof o.confidence === "number" && Number.isFinite(o.confidence) ? o.confidence : null;
  const summary =
    typeof o.summary === "string" ? o.summary
    : typeof o.explanation === "string" ? o.explanation
    : null;
  const rootCause =
    typeof o.rootCause === "string" ? o.rootCause
    : typeof o.root_cause === "string" ? o.root_cause
    : null;
  const generatedAt =
    typeof o.generatedAt === "string" ? o.generatedAt
    : typeof o.generated_at === "string" ? o.generated_at
    : typeof o.createdAt === "string" ? o.createdAt
    : null;

  if (!summary && !rootCause && recommendations.length === 0) return null;
  return { summary, rootCause, recommendations, confidence, generatedAt };
}

export function toCopyableJson(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, v) => (v instanceof Set ? Array.from(v) : v), 2);
  } catch {
    return String(value);
  }
}
