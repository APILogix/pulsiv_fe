import { useState, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiClient } from '@/infrastructure/api-client/axios';
import { useOrgStore } from '@/modules/organizations/store/org.store';
import { useBootstrapUsage, useBootstrapBilling, useBootstrapStore } from '@/modules/bootstrap';
import clsx from 'clsx';

export interface QuotaSummaryData {
  eventsLeft: number;
  totalEvents: number;
  billingCycleEndDate: string;
  aiCreditsTotal: number;
  aiCreditsLeft: number;
}

/**
 * Formats quota credit numbers into human-readable compact units (e.g. 0, 8M, 500k).
 * Formats each number independently rather than assuming usage and limit share the same scale.
 */
export function formatQuotaValue(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '0';
  const num = Number(value);
  if (num === 0) return '0';
  if (num >= 1_000_000_000) {
    const val = num / 1_000_000_000;
    return `${val % 1 === 0 ? val.toFixed(0) : parseFloat(val.toFixed(1))}B`;
  }
  if (num >= 1_000_000) {
    const val = num / 1_000_000;
    return `${val % 1 === 0 ? val.toFixed(0) : parseFloat(val.toFixed(1))}M`;
  }
  if (num >= 1_000) {
    const val = num / 1_000;
    return `${val % 1 === 0 ? val.toFixed(0) : parseFloat(val.toFixed(1))}k`;
  }
  return num.toLocaleString();
}

export function QuotaCardWidget() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const bootstrapUsage = useBootstrapUsage();
  const bootstrapBilling = useBootstrapBilling();
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
        const totalEv = d.totalEvents ?? 1000000;
        const leftEv = d.eventsLeft ?? totalEv;
        const usedEv = Math.max(0, totalEv - leftEv);

        const totalAi = d.aiCreditsTotal ?? 500;
        const leftAi = d.aiCreditsLeft ?? totalAi;
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

  useEffect(() => {
    fetchQuotaSummary();
  }, [fetchQuotaSummary]);

  // Priority: Override -> Bootstrap Zustand Store -> Safe Fallbacks
  const totalEvents = overrideData?.totalEvents ?? bootstrapUsage?.monthlyEvents.limit ?? 1000000;
  const isUnlimitedEvents = totalEvents < 0;
  const eventsLeft = overrideData?.eventsLeft ?? bootstrapUsage?.monthlyEvents.remaining ?? (isUnlimitedEvents ? -1 : totalEvents);
  const eventsUsed = overrideData
    ? (isUnlimitedEvents ? 0 : Math.max(0, totalEvents - (eventsLeft < 0 ? 0 : eventsLeft)))
    : (bootstrapUsage?.monthlyEvents.used ?? (isUnlimitedEvents ? 0 : Math.max(0, totalEvents - eventsLeft)));
  const ingestPercent = bootstrapUsage?.monthlyEvents.percentage ?? (isUnlimitedEvents ? 0 : (totalEvents > 0 ? Math.min(100, Math.round((eventsUsed / totalEvents) * 100)) : 0));

  const aiCreditsTotal = overrideData?.aiCreditsTotal ?? bootstrapUsage?.aiCredits.limit ?? 500;
  const isUnlimitedAi = aiCreditsTotal < 0;
  const aiCreditsLeft = overrideData?.aiCreditsLeft ?? bootstrapUsage?.aiCredits.remaining ?? (isUnlimitedAi ? -1 : aiCreditsTotal);
  const aiCreditsUsed = overrideData
    ? (isUnlimitedAi ? 0 : Math.max(0, aiCreditsTotal - (aiCreditsLeft < 0 ? 0 : aiCreditsLeft)))
    : (bootstrapUsage?.aiCredits.used ?? (isUnlimitedAi ? 0 : Math.max(0, aiCreditsTotal - aiCreditsLeft)));
  const aiPercent = bootstrapUsage?.aiCredits.percentage ?? (isUnlimitedAi ? 0 : (aiCreditsTotal > 0 ? Math.min(100, Math.round((aiCreditsUsed / aiCreditsTotal) * 100)) : 0));

  const endDateStr = overrideData?.billingCycleEndDate ?? bootstrapBilling?.currentPeriodEnd ?? null;
  const resetDays = endDateStr
    ? Math.max(0, Math.ceil((new Date(endDateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : (() => {
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return Math.max(0, Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      })();

  return (
    <div className="shrink-0 p-3 mt-auto border-t border-[var(--border)]">
      <div className="group h-[92px] [perspective:1000px]">
        <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
          {/* Front: Credits quota */}
          <div className="absolute inset-0 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/40 px-3 py-2.5 flex flex-col justify-between overflow-hidden [backface-visibility:hidden]">
            <div className="flex justify-between items-center font-mono">
              <span className="text-[10px] tracking-[0.09em] text-[var(--text3)] uppercase">Credits quota</span>
              <span className="text-[12px] font-medium tabular-nums text-[var(--text)]">{ingestPercent}%</span>
            </div>
            <div className="h-1.5 w-full bg-[var(--bg3)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--brand)] rounded-full transition-all duration-300" style={{ width: `${ingestPercent}%` }} />
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[var(--text3)] flex justify-between items-center gap-1.5 min-w-0">
              <span
                className="truncate"
                title={`${eventsUsed.toLocaleString()} / ${isUnlimitedEvents ? 'Unlimited' : totalEvents.toLocaleString()} credits`}
              >
                {formatQuotaValue(eventsUsed)} / {isUnlimitedEvents ? '∞' : `${formatQuotaValue(totalEvents)} credits`}
              </span>
              <span className="shrink-0 whitespace-nowrap text-[10.5px]">&middot; resets in {resetDays}d</span>
            </div>
          </div>

          {/* Back: AI credit usage with Refresh Icon */}
          <div className="absolute inset-0 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/40 px-3 py-2.5 flex flex-col justify-between overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)]">
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
            <div className="text-[11px] font-mono tabular-nums text-[var(--text3)] flex justify-between items-center gap-1.5 min-w-0">
              <span
                className="truncate"
                title={`${aiCreditsUsed.toLocaleString()} / ${isUnlimitedAi ? 'Unlimited' : aiCreditsTotal.toLocaleString()} credits`}
              >
                {formatQuotaValue(aiCreditsUsed)} / {isUnlimitedAi ? '∞' : `${formatQuotaValue(aiCreditsTotal)} credits`}
              </span>
              <span className="shrink-0 whitespace-nowrap text-[10.5px]">&middot; resets in {resetDays}d</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
