import { RotateCcw } from "lucide-react";
import { Timestamp } from "@/shared/observe";
import type { ErrorGroup } from "../types/error-group";

export function RegressionBanner({ group }: { group: ErrorGroup }) {
  const count = Number(group.regression?.count ?? group.regressionCount ?? 0);
  if (!group.isRegression && count === 0) return null;
  const release = group.release?.latest ?? group.latestRelease;
  const at = group.regression?.lastRegressedAt ?? group.lastRegressedAt;

  return (
    <div role="status" className="flex items-start gap-3 rounded-[var(--radius-lg)] bg-[var(--red-bg)] px-4 py-3 text-[13px]">
      <RotateCcw className="mt-0.5 size-4 shrink-0 text-[var(--red)]" aria-hidden="true" />
      <p className="leading-[1.6] text-[var(--text)]">
        <span className="font-medium text-[var(--red)]">Regressed {count > 1 ? `${count} times` : "after a fix"}.</span>{" "}
        This issue was resolved and came back
        {release ? <> in <span className="font-[family-name:var(--mono)]">{release}</span></> : null}
        {at ? <> <Timestamp value={at} /></> : null}. Check what that release changed near the top in-app frame.
      </p>
    </div>
  );
}
