import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/infrastructure/api-client/axios";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { InteractiveJsonViewer } from "../request-detail/InteractiveJsonViewer";
import { sectionDomId } from "./helpers";
import { EmptyInline, SectionShell } from "./ui";
import type { ErrorDeveloperToolsResponse } from "./types";

export function DeveloperToolsSection({ publicId }: { publicId: string }) {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ErrorDeveloperToolsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !activeOrgId || !publicId || data) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient
      .get(`/organizations/${activeOrgId}/observability/errors/${encodeURIComponent(publicId)}/developer-tools`)
      .then((res) => {
        if (cancelled) return;
        setData((res.data?.data || res.data) as ErrorDeveloperToolsResponse);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load developer tools for this error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, activeOrgId, publicId, data]);

  return (
    <SectionShell
      id={sectionDomId("developer-tools")}
      title="Developer Tools"
      description="Raw dumps are fetched only when expanded. Sensitive fields are masked."
      action={
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border2)] px-3 text-[12px] text-[var(--text2)] transition-colors hover:border-[var(--text3)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          aria-expanded={open}
        >
          {open ? "Collapse" : "Expand"}
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </button>
      }
    >
      {!open ? (
        <EmptyInline message="Collapsed by default to keep the detail payload fast and compact. Expand to fetch raw SDK, normalized, and database records." />
      ) : loading ? (
        <div className="space-y-3">
          <div className="loading-skeleton h-24 rounded-[var(--radius)] bg-[var(--bg2)]" />
          <div className="loading-skeleton h-24 rounded-[var(--radius)] bg-[var(--bg2)]" />
        </div>
      ) : error ? (
        <p className="text-[13px] text-[var(--red)]">{error}</p>
      ) : data ? (
        <div className="flex flex-col gap-4">
          <InteractiveJsonViewer data={data.rawSdkEvent} title="Raw SDK event" />
          <InteractiveJsonViewer data={data.normalizedEvent} title="Normalized event" />
          <InteractiveJsonViewer data={data.rawDatabaseRecord} title="Raw database record" />
        </div>
      ) : null}
    </SectionShell>
  );
}
