import type { AiAnswer } from "../types";

/** Serialize a structured AI answer to a shareable Markdown document. */
export function answerToMarkdown(title: string, answer: AiAnswer): string {
  const lines: string[] = [];
  lines.push(`# ${title}`, "");
  lines.push(`_Confidence: ${answer.confidence_score}%_`, "");

  if (answer.plain_language_summary) {
    lines.push("## Summary", "", answer.plain_language_summary, "");
  }
  if (answer.business_impact) {
    lines.push("## Business impact", "", answer.business_impact, "");
  }
  if (answer.technical_analysis) {
    lines.push("## Technical analysis", "", answer.technical_analysis, "");
  }
  if (answer.likely_causes.length > 0) {
    lines.push("## Root cause", "");
    for (const cause of [...answer.likely_causes].sort((a, b) => a.rank - b.rank)) {
      lines.push(`### ${cause.rank}. ${cause.cause} (${cause.confidence}%)`, "");
      if (cause.reasoning) lines.push(cause.reasoning, "");
      if (cause.recommended_action) lines.push(`- Recommended: ${cause.recommended_action}`, "");
    }
  }
  if (answer.suggested_fixes.length > 0) {
    lines.push("## Suggested fixes", "");
    answer.suggested_fixes.forEach((fix, i) => lines.push(`${i + 1}. ${fix}`));
    lines.push("");
  }
  if (answer.verification_steps.length > 0) {
    lines.push("## Verification steps", "");
    answer.verification_steps.forEach((step) => lines.push(`- ${step}`));
    lines.push("");
  }
  if (answer.prevention_recommendations.length > 0) {
    lines.push("## Prevention", "");
    answer.prevention_recommendations.forEach((rec) => lines.push(`- ${rec}`));
    lines.push("");
  }
  if (answer.citations.length > 0) {
    lines.push("## Related resources", "");
    answer.citations.forEach((c) => lines.push(`- **${c.title}** (${c.source_type}) — ${c.url_or_reference}`));
    lines.push("");
  }
  return lines.join("\n");
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
