import { useState } from "react";
import { useNavigate } from "react-router";
import { Plus } from "lucide-react";
import { useAlertRules } from "@/hooks/useDummyData";
import {
  PageHeader, KpiCard, FillPage, InfiniteTable, SeverityBadge, Button, Timestamp, demoAction, demoSuccess,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { AlertRule } from "@/lib/dummy-data";
import { cn } from "@/lib/utils";

export default function AlertRulesPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useAlertRules();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const rules = data ?? [];

  const isOn = (id: string, def: boolean) => enabled[id] ?? def;

  const toggle = (r: AlertRule) => {
    const next = !isOn(r.id, r.enabled);
    setEnabled((p) => ({ ...p, [r.id]: next }));
    demoSuccess(`${r.name} ${next ? "enabled" : "disabled"}`);
  };

  const columns: Column<AlertRule>[] = [
    { key: "name", header: "Name", width: "1fr", cell: (r) => <span className="truncate font-medium">{r.name}</span> },
    { key: "type", header: "Type", width: "110px", cell: (r) => <span className="capitalize text-[var(--text2)]">{r.type}</span> },
    { key: "source", header: "Source", width: "150px", cell: (r) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{r.source}</span> },
    { key: "severity", header: "Severity", width: "90px", cell: (r) => <SeverityBadge severity={r.severity} /> },
    { key: "window", header: "Window", width: "80px", cell: (r) => <span className="tabular-nums text-[var(--text2)]">{r.window}</span> },
    { key: "triggered", header: "Last triggered", width: "150px", cell: (r) => (r.lastTriggeredAt ? <Timestamp value={r.lastTriggeredAt} /> : <span className="text-[var(--text3)]">—</span>) },
    {
      key: "enabled",
      header: "Enabled",
      width: "90px",
      cell: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggle(r); }}
          role="switch"
          aria-checked={isOn(r.id, r.enabled)}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
            isOn(r.id, r.enabled) ? "bg-[var(--brand)]" : "bg-[var(--bg3)]"
          )}
        >
          <span className={cn("inline-block size-4 transform rounded-full bg-white shadow-sm transition-transform", isOn(r.id, r.enabled) ? "translate-x-[18px]" : "translate-x-0.5")} />
        </button>
      ),
    },
  ];

  return (
    <FillPage>
      <PageHeader
        title="Alert Rules"
        description="Rule authoring for thresholds, anomalies, and conditions."
        actions={<Button variant="primary" onClick={() => demoAction("Create alert rule")}><Plus className="size-4" /> New rule</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Rules" value={rules.length} />
        <KpiCard label="Enabled" value={rules.filter((r) => isOn(r.id, r.enabled)).length} />
        <KpiCard label="Triggered (7d)" value={rules.filter((r) => r.lastTriggeredAt).length} />
        <KpiCard label="Anomaly rules" value={rules.filter((r) => r.type === "anomaly").length} />
      </div>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={rules}
        queryKey={["alertRules"]}
        columns={columns}
        getKey={(r) => r.id}
        onRowClick={(r) => navigate(`/alerts/rules/${r.id}`)}
      />
    </FillPage>
  );
}
