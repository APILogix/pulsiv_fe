import { useState } from "react";
import { PageHeader, SectionCard, Button, demoSuccess } from "@/shared/observe";

const TIERS = [
  { name: "Errors", days: 90, costPerDay: 0.4 },
  { name: "Requests", days: 30, costPerDay: 0.8 },
  { name: "Logs", days: 14, costPerDay: 1.2 },
  { name: "Traces", days: 7, costPerDay: 0.6 },
  { name: "Metrics", days: 90, costPerDay: 0.2 },
];

export default function DataRetentionPage() {
  const [retention, setRetention] = useState<Record<string, number>>(Object.fromEntries(TIERS.map((t) => [t.name, t.days])));
  const monthlyCost = TIERS.reduce((s, t) => s + retention[t.name] * t.costPerDay, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Data Retention"
        description="Configure how long each event type is retained."
        actions={<Button variant="primary" onClick={() => demoSuccess("Retention policy saved")}>Save policy</Button>}
      />

      <SectionCard title="Retention by event type">
        <div className="flex flex-col gap-5">
          {TIERS.map((t) => (
            <div key={t.name}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-medium text-[var(--text)]">{t.name}</span>
                <span className="text-[13px] tabular-nums text-[var(--text2)]">{retention[t.name]} days</span>
              </div>
              <input
                type="range" min={1} max={365} value={retention[t.name]}
                onChange={(e) => setRetention((p) => ({ ...p, [t.name]: Number(e.target.value) }))}
                className="w-full accent-[var(--brand)]"
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Cost implications">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-[var(--text2)]">Estimated monthly storage cost based on current retention settings.</p>
          <span className="text-2xl font-semibold text-[var(--text)]">${monthlyCost.toFixed(2)}<span className="text-sm font-normal text-[var(--text3)]">/mo</span></span>
        </div>
      </SectionCard>
    </div>
  );
}
