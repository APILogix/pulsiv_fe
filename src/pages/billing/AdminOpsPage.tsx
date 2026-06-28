import { ShieldCheck } from "lucide-react";
import { PageHeader, SectionCard, Button, demoAction, demoSuccess } from "@/shared/observe";

const OPS = [
  { title: "Sync subscription", desc: "Force a sync with the billing provider.", action: "Sync now", danger: false },
  { title: "Apply credit", desc: "Issue account credit to the organization.", action: "Apply credit", danger: false },
  { title: "Override plan", desc: "Manually override the active plan.", action: "Override", danger: true },
  { title: "Waive invoice", desc: "Waive an outstanding invoice balance.", action: "Waive", danger: true },
];

export default function AdminOpsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Admin Ops" description="Privileged billing sync, overrides, credits, and waive actions." />

      <div className="flex items-center gap-2 rounded-[10px] border border-[var(--amber)]/30 bg-[var(--amber-bg)] px-4 py-3 text-[13px] text-[var(--amber)]">
        <ShieldCheck className="size-4" /> These operations are restricted to billing administrators and are fully audited.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {OPS.map((op) => (
          <SectionCard key={op.title}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--text)]">{op.title}</div>
                <p className="text-[13px] text-[var(--text2)]">{op.desc}</p>
              </div>
              <Button variant={op.danger ? "danger" : "secondary"} onClick={() => (op.danger ? demoAction(op.action) : demoSuccess(`${op.action} complete`))}>{op.action}</Button>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
