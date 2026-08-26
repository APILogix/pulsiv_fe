import React, { useState } from "react";
import { Copy, Download, Code2, Check } from "lucide-react";
import { Button, CopyButton } from "@/shared/observe";
import { SectionShell } from "./ui";
import { sectionDomId, toCopyableJson } from "./helpers";
import type { TraceDetailData } from "./types";

export function DeveloperToolsSection({ detail }: { detail: TraceDetailData }) {
  const jsonContent = toCopyableJson(detail);

  const handleDownload = () => {
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trace-${detail.publicId || detail.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SectionShell
      id={sectionDomId("devtools")}
      title="Developer Tools & Raw Telemetry"
      description="Inspect or export full JSON telemetry payloads for this trace."
      action={
        <div className="flex items-center gap-2">
          <CopyButton value={jsonContent} label="Copy JSON" />
          <Button variant="outline" className="h-8 gap-1.5" onClick={handleDownload}>
            <Download className="size-3.5" />
            Download
          </Button>
        </div>
      }
    >
      <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg2)]/50 px-4 py-2 font-mono text-[11px] text-[var(--text3)]">
          <span>trace-payload.json</span>
          <span>{detail.spans?.length ?? 0} spans · {(jsonContent.length / 1024).toFixed(1)} KB</span>
        </div>
        <pre className="max-h-96 overflow-auto p-4 font-mono text-[12px] leading-relaxed text-[var(--text2)]">
          {jsonContent}
        </pre>
      </div>
    </SectionShell>
  );
}
