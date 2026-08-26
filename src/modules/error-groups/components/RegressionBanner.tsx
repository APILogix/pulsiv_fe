import { AlertTriangle } from "lucide-react";
import type { ErrorGroup } from "../types/error-group";
import { Timestamp } from "@/shared/observe";

interface RegressionBannerProps {
  group: ErrorGroup;
}

export function RegressionBanner({ group }: RegressionBannerProps) {
  if (!group.isRegression) return null;

  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--amber)]/40 bg-[var(--amber-bg)] p-4 text-[13px] text-[var(--amber)]">
      <AlertTriangle className="size-5 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <div className="font-semibold text-[14px]">
          ⚠ Active Regression Detected ({group.regressionCount} regressed release{group.regressionCount > 1 ? "s" : ""})
        </div>
        <div>
          This error group was previously resolved but re-occurred in release{" "}
          <strong className="font-[family-name:var(--mono)]">{group.latestRelease}</strong>{" "}
          {group.lastRegressedAt && (
            <span>
              (<Timestamp value={group.lastRegressedAt} />)
            </span>
          )}
          .
        </div>
      </div>
    </div>
  );
}
