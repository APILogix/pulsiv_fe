import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CopyButton, StatusBadge, Timestamp } from "@/shared/observe";
import { RefreshCcw, PowerOff } from "lucide-react";
import { useParams } from "react-router";
import { useProjectMutations } from "./hooks/useProjects";
import type { ProjectApiKeyView } from "./api/projects.api";

export function ApiKeyDetailsSheet({ apiKey, children }: { apiKey: ProjectApiKeyView; children?: ReactNode }) {
  const { projectId = "" } = useParams();
  const { rotateApiKey, disableApiKey } = useProjectMutations();

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle>{apiKey.name}</SheetTitle>
              <SheetDescription className="mt-1">
                Detailed usage and configuration for this key.
              </SheetDescription>
            </div>
            <StatusBadge status={apiKey.status} />
          </div>
        </SheetHeader>
        
        <div className="flex flex-col gap-6 py-6">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg1)] p-4">
            <div className="text-[12px] font-medium text-[var(--text2)] uppercase tracking-wider mb-2">Key String</div>
            <CopyButton value={`${apiKey.prefix}_${apiKey.id}`} label={`${apiKey.prefix}••••`} />
          </div>

            <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--bg1)]">
              <div className="text-[12px] text-[var(--text3)] mb-1">Environment</div>
              <div className="capitalize text-[14px] font-medium text-[var(--text)]">{apiKey.environment}</div>
            </div>
            <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--bg1)]">
              <div className="text-[12px] text-[var(--text3)] mb-1">Created</div>
              <div className="text-[14px] font-medium text-[var(--text)]"><Timestamp value={apiKey.createdAt} /></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--bg1)]">
              <div className="text-[12px] text-[var(--text3)] mb-1">Last Used</div>
              <div className="text-[14px] font-medium text-[var(--text)]">
                {apiKey.lastUsedAt ? <Timestamp value={apiKey.lastUsedAt} /> : "Never"}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--bg1)]">
              <div className="text-[12px] text-[var(--text3)] mb-1">Expires</div>
              <div className="text-[14px] font-medium text-[var(--text)]">
                {apiKey.expiresAt ? <Timestamp value={apiKey.expiresAt} /> : "Never"}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)]">
            <h4 className="text-[14px] font-medium text-[var(--text)] mb-3">Key Management</h4>
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="justify-start h-10" onClick={() => rotateApiKey.mutate({ projectId, keyId: apiKey.id })}>
                <RefreshCcw className="mr-2 size-4 text-[var(--text2)]" /> Rotate Key
              </Button>
              {apiKey.status === "active" ? (
                <Button variant="outline" className="justify-start h-10 text-[var(--red)] hover:text-[var(--red)]" onClick={() => disableApiKey.mutate({ projectId, keyId: apiKey.id })}>
                  <PowerOff className="mr-2 size-4" /> Disable Key
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
