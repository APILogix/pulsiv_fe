import { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiClient } from '@/infrastructure/api-client/axios';
import { useOrgStore } from '@/modules/organizations/store/org.store';
import { useBootstrapUsage, useBootstrapStore } from '@/modules/bootstrap';
import clsx from 'clsx';

export interface QuotaSummaryData {
  eventsLeft: number;
  totalEvents: number;
  billingCycleEndDate: string;
  aiCreditsTotal: number;
  aiCreditsLeft: number;
}

export function QuotaCardWidget() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const bootstrapUsage = useBootstrapUsage();
  const updateUsage = useBootstrapStore((s) => s.updateUsage);

  const [isLoading, setIsLoading] = useState(false);
  const [overrideData, setOverrideData] = useState<QuotaSummaryData | null>(null);

  const fetchQuotaSummary = useCallback(async () => {
    if (!activeOrgId) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get('/billing/usage/quota-summary', {
        headers: { 'x-org-id': activeOrgId },
      });
      if (res.data?.success && res.data?.data) {
        const d: QuotaSummaryData = res.data.data;
        setOverrideData(d);

        // Sync fresh quota summary directly into Zustand bootstrap usage state
        const totalEv = d.totalEvents || 1000000;
        const leftEv = d.eventsLeft ?? 320000;
        const usedEv = Math.max(0, totalEv - leftEv);

        const totalAi = d.aiCreditsTotal || 500;
        const leftAi = d.aiCreditsLeft ?? 290;
        const usedAi = Math.max(0, totalAi - leftAi);

        updateUsage({
          monthlyEvents: {
            limit: totalEv,
            used: usedEv,
            remaining: leftEv,
            percentage: totalEv > 0 ? Math.min(100, Math.round((usedEv / totalEv) * 100)) : 0,
          },
          aiCredits: {
            limit: totalAi,
            used: usedAi,
            remaining: leftAi,
            percentage: totalAi > 0 ? Math.min(100, Math.round((usedAi / totalAi) * 100)) : 0,
          },
        });
      }
    } catch {
      // Retain existing state on transient errors
    } finally {
      setIsLoading(false);
    }
  }, [activeOrgId, updateUsage]);

  // Priority: Override -> Bootstrap Zustand Store -> Safe Fallbacks
  const totalEvents = overrideData?.totalEvents ?? bootstrapUsage?.monthlyEvents.limit ?? 1000000;
  const eventsLeft = overrideData?.eventsLeft ?? bootstrapUsage?.monthlyEvents.remaining ?? 320000;
  const eventsUsed = overrideData
    ? Math.max(0, totalEvents - eventsLeft)
    : (bootstrapUsage?.monthlyEvents.used ?? Math.max(0, totalEvents - eventsLeft));
  const ingestPercent = bootstrapUsage?.monthlyEvents.percentage ?? (totalEvents > 0 ? Math.min(100, Math.round((eventsUsed / totalEvents) * 100)) : 0);

  const aiCreditsTotal = overrideData?.aiCreditsTotal ?? bootstrapUsage?.aiCredits.limit ?? 500;
  const aiCreditsLeft = overrideData?.aiCreditsLeft ?? bootstrapUsage?.aiCredits.remaining ?? 290;
  const aiCreditsUsed = overrideData
    ? Math.max(0, aiCreditsTotal - aiCreditsLeft)
    : (bootstrapUsage?.aiCredits.used ?? Math.max(0, aiCreditsTotal - aiCreditsLeft));
  const aiPercent = bootstrapUsage?.aiCredits.percentage ?? (aiCreditsTotal > 0 ? Math.min(100, Math.round((aiCreditsUsed / aiCreditsTotal) * 100)) : 0);

  const resetDays = overrideData?.billingCycleEndDate
    ? Math.max(0, Math.ceil((new Date(overrideData.billingCycleEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 9;

  return (
    <div className="shrink-0 p-3 mt-auto border-t border-[var(--border)]">
      <div className="group h-[92px] [perspective:1000px]">
        <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
          {/* Front: Ingest quota */}
          <div className="absolute inset-0 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/40 p-3 flex flex-col gap-2.5 overflow-hidden [backface-visibility:hidden]">
            <div className="flex justify-between items-center font-mono">
              <span className="text-[10px] tracking-[0.09em] text-[var(--text3)] uppercase">Ingest quota</span>
              <span className="text-[12px] font-medium tabular-nums text-[var(--text)]">{ingestPercent}%</span>
            </div>
            <div className="h-1.5 w-full bg-[var(--bg3)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--brand)] rounded-full transition-all duration-300" style={{ width: `${ingestPercent}%` }} />
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[var(--text3)] flex justify-between items-center gap-1 min-w-0">
              <span className="truncate">
                {eventsUsed >= 1000000
                  ? `${(eventsUsed / 1000000).toFixed(1)}M / ${(totalEvents / 1000000).toFixed(1)}M`
                  : `${(eventsUsed / 1000).toFixed(0)}k / ${(totalEvents / 1000).toFixed(0)}k`}
              </span>
              <span className="shrink-0 whitespace-nowrap">&middot; resets in {resetDays}d</span>
            </div>
          </div>

          {/* Back: AI credit usage with Refresh Icon */}
          <div className="absolute inset-0 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/40 p-3 flex flex-col gap-2.5 overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="flex justify-between items-center font-mono">
              <span className="text-[10px] tracking-[0.09em] text-[var(--text3)] uppercase">AI credit</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchQuotaSummary();
                }}
                title="Refresh Quota Summary"
                className="p-1 text-[var(--text3)] hover:text-[var(--text)] rounded transition-colors cursor-pointer"
              >
                <RefreshCw className={clsx("size-3.5", isLoading && "animate-spin text-[var(--brand)]")} />
              </button>
            </div>
            <div className="h-1.5 w-full bg-[var(--bg3)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--brand)] rounded-full transition-all duration-300" style={{ width: `${aiPercent}%` }} />
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[var(--text3)] flex justify-between items-center gap-1 min-w-0">
              <span className="truncate">{aiCreditsUsed} / {aiCreditsTotal} credits</span>
              <span className="shrink-0 whitespace-nowrap">&middot; resets in {resetDays}d</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
