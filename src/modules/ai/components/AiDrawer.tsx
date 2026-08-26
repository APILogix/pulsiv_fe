import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Sparkles, MessagesSquare, FlaskConical } from "lucide-react";
import { useAiDrawerStore } from "../store/ai-drawer.store";
import { AiDrawerChat } from "./AiDrawerChat";
import { AiDrawerInvestigate } from "./AiDrawerInvestigate";
import { cn } from "@/lib/utils";

export function AiDrawer() {
  const isOpen = useAiDrawerStore((s) => s.isOpen);
  const mode = useAiDrawerStore((s) => s.mode);
  const setMode = useAiDrawerStore((s) => s.setMode);
  const close = useAiDrawerStore((s) => s.close);
  const context = useAiDrawerStore((s) => s.context);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[720px] md:max-w-[880px] lg:max-w-[1020px] xl:max-w-[1140px] 2xl:max-w-[1240px] p-0 gap-0 flex flex-col bg-[var(--bg1)] border-l border-[var(--border)] shadow-2xl font-sans"
      >
        {/* Drawer Header */}
        <SheetHeader className="border-b border-[var(--border)] px-6 py-4 bg-[var(--bg2)]/60 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-[var(--radius)] bg-[var(--ai-bg)] text-[var(--ai)] shadow-sm">
                <Sparkles className="size-4" />
              </span>
              <div>
                <SheetTitle className="text-[15px] font-semibold text-[var(--text)] tracking-tight">
                  Pulse Intelligence
                </SheetTitle>
                <SheetDescription className="text-[11.5px] text-[var(--text3)]">
                  Grounded observability assistant & root cause analysis
                </SheetDescription>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center rounded-[var(--radius)] border border-[var(--border2)] bg-[var(--bg1)] p-0.5 mr-6">
              <button
                type="button"
                onClick={() => setMode("chat")}
                className={cn(
                  "flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1 text-[12px] font-medium transition-colors",
                  mode === "chat"
                    ? "bg-[var(--bg3)] text-[var(--text)] shadow-xs"
                    : "text-[var(--text3)] hover:text-[var(--text)]"
                )}
              >
                <MessagesSquare className="size-3.5" />
                Chat
              </button>
              <button
                type="button"
                onClick={() => setMode("investigate")}
                className={cn(
                  "flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1 text-[12px] font-medium transition-colors",
                  mode === "investigate"
                    ? "bg-[var(--ai-bg)] text-[var(--ai)] shadow-xs font-semibold"
                    : "text-[var(--text3)] hover:text-[var(--text)]"
                )}
              >
                <FlaskConical className="size-3.5" />
                Investigate
                {context?.publicId && (
                  <span className="size-1.5 rounded-full bg-[var(--ai)] animate-pulse" />
                )}
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Drawer Body */}
        <div className="flex-1 min-h-0">
          {mode === "chat" ? <AiDrawerChat /> : <AiDrawerInvestigate />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
