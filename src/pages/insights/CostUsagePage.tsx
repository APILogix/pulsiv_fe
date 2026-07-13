import { useState } from "react";
import { PageHeader, KpiCard, SectionCard, Table, Tr, Td, MetricSparkline } from "@/shared/observe";

const MODELS = [
  { model: "gpt-4o", calls: 42_000, tokens: 18_400_000, cost: "$184.00" },
  { model: "claude-3.5-sonnet", calls: 28_000, tokens: 12_100_000, cost: "$121.00" },
  { model: "embedding-3-large", calls: 220_000, tokens: 44_000_000, cost: "$5.72" },
  { model: "gpt-4o-mini", calls: 96_000, tokens: 31_000_000, cost: "$18.60" },
];

export default function CostUsagePage() {
  const [sparklineData] = useState(() => Array.from({ length: 30 }, (_, i) => 5 + i * 0.4 + Math.random() * 3));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Cost & Usage" description="AI model spend tracking and token usage governance." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Spend (MTD)" value="$329.32" trend="down" delta="+12%" />
        <KpiCard label="Total tokens" value="105.5M" />
        <KpiCard label="API calls" value="386k" />
        <KpiCard label="Budget used" value="66%" />
      </div>

      <SectionCard title="Spend trend (30d)">
        <MetricSparkline data={sparklineData} color="var(--violet)" width={760} height={120} />
      </SectionCard>

      <SectionCard title="Breakdown by model" className="p-0">
        <Table headers={["Model", "Calls", "Tokens", "Cost"]}>
          {MODELS.map((m) => (
            <Tr key={m.model}>
              <Td className="font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{m.model}</Td>
              <Td className="tabular-nums">{m.calls.toLocaleString()}</Td>
              <Td className="tabular-nums text-[var(--text2)]">{m.tokens.toLocaleString()}</Td>
              <Td className="font-semibold">{m.cost}</Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>
    </div>
  );
}
