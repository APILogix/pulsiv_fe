import { useState } from "react";
import { PageHeader, SectionCard, Button, demoSuccess } from "@/shared/observe";
import { cn } from "@/lib/utils";

const PREFS = [
  { key: "email", label: "Email notifications", desc: "Receive alert emails to your inbox." },
  { key: "incidents", label: "Incident assignments", desc: "Notify me when I'm assigned an incident." },
  { key: "digest", label: "Daily digest", desc: "A summary of activity once per day." },
  { key: "mentions", label: "Mentions", desc: "Notify me when mentioned in a comment." },
  { key: "escalations", label: "Escalation pages", desc: "Page me when I'm on-call." },
];

export default function SettingsAlertRulesPage() {
  const [on, setOn] = useState<Record<string, boolean>>({ email: true, incidents: true, digest: false, mentions: true, escalations: true });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Alert Rules" description="Personal alert and notification preferences." actions={<Button variant="primary" onClick={() => demoSuccess("Preferences saved")}>Save</Button>} />

      <SectionCard title="Notification preferences">
        <div className="flex flex-col divide-y divide-[var(--border)]">
          {PREFS.map((p) => (
            <div key={p.key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <div className="text-[13px] font-medium text-[var(--text)]">{p.label}</div>
                <p className="text-[12px] text-[var(--text3)]">{p.desc}</p>
              </div>
              <button
                onClick={() => setOn((s) => ({ ...s, [p.key]: !s[p.key] }))}
                className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on[p.key] ? "bg-[var(--brand)]" : "bg-[var(--bg3)]")}
              >
                <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", on[p.key] ? "translate-x-4" : "translate-x-0.5")} />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
