import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CopyButton, MetricSparkline, StatusBadge, Timestamp } from "@/shared/observe";
import { RefreshCcw, PowerOff, Power } from "lucide-react";
import { useParams } from "react-router";
import { useProjectMutations } from "./hooks/useProjects";

export function ApiKeyDetailsSheet({ apiKey, children }: { apiKey: any, children?: React.ReactNode }) {
  const { projectId = "" } = useParams();
  const { rotateApiKey, disableApiKey, enableApiKey } = useProjectMutations();

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
              <div className="text-[12px] text-[var(--text3)] mb-1">Type</div>
              <div className="capitalize text-[14px] font-medium text-[var(--text)]">{apiKey.type}</div>
            </div>
            <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--bg1)]">
              <div className="text-[12px] text-[var(--text3)] mb-1">Created</div>
              <div className="text-[14px] font-medium text-[var(--text)]"><Timestamp value={apiKey.createdAt} /></div>
            </div>
          </div>

          <div>
            <h4 className="text-[14px] font-medium text-[var(--text)] mb-3">Usage (Last 7 Days)</h4>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg1)] p-4">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <div className="text-[12px] text-[var(--text3)]">Total Requests</div>
                  <div className="text-xl font-semibold">{Intl.NumberFormat('en-US', { notation: 'compact' }).format(apiKey.usage24h * 7)}</div>
                </div>
              </div>
              <MetricSparkline data={Array.from({ length: 14 }, () => Math.random() * 1000 + 500)} color="var(--brand)" height={80} />
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
              ) : (
                <Button variant="outline" className="justify-start h-10 text-[var(--green)] hover:text-[var(--green)]" onClick={() => enableApiKey.mutate({ projectId, keyId: apiKey.id })}>
                  <Power className="mr-2 size-4" /> Enable Key
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
