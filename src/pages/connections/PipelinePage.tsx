import { ArrowRight, RotateCw } from "lucide-react";
import { PageHeader, KpiCard, SectionCard, Table, Tr, Td, StatusCodeBadge, Button, Timestamp, demoSuccess } from "@/shared/observe";

const STAGES = ["Ingest", "Validate", "Enrich", "Dedupe", "Store"];

export default function PipelinePage() {
  const deadLetters = Array.from({ length: 12 }, (_, i) => ({
    id: `dl-${i}`,
    eventType: ["error", "request", "log", "span"][i % 4],
    reason: ["Schema mismatch", "Payload too large", "Invalid timestamp", "Missing API key"][i % 4],
    code: [422, 413, 400, 401][i % 4],
    ts: Date.now() - i * 1800000,
  }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Replay & Pipeline"
        description="Replay, dead-letter recovery, and pipeline controls."
        actions={<Button variant="primary" onClick={() => demoSuccess("Replay started for all dead-letter events")}><RotateCw className="size-4" /> Replay all</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Processed / 24h" value="2.1M" />
        <KpiCard label="Dead-lettered" value={deadLetters.length} trend="down" />
        <KpiCard label="Replayed (7d)" value="438" />
        <KpiCard label="Pipeline lag" value="120ms" />
      </div>

      <SectionCard title="Pipeline flow">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          {STAGES.map((stage, i) => (
            <div key={stage} className="flex items-center gap-2">
              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-3 text-center">
                <div className="text-[13px] font-medium text-[var(--text)]">{stage}</div>
                <div className="mt-1 text-[11px] text-[var(--green)]">healthy</div>
              </div>
              {i < STAGES.length - 1 && <ArrowRight className="size-4 shrink-0 text-[var(--text3)]" />}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Dead-letter queue" className="p-0">
        <Table headers={["Event type", "Reason", "Code", "Time", ""]}>
          {deadLetters.map((d) => (
            <Tr key={d.id}>
              <Td className="capitalize">{d.eventType}</Td>
              <Td className="text-[var(--text2)]">{d.reason}</Td>
              <Td><StatusCodeBadge code={d.code} /></Td>
              <Td><Timestamp value={d.ts} /></Td>
              <Td><Button variant="ghost" onClick={() => demoSuccess(`Replayed ${d.id}`)}><RotateCw className="size-3.5" /> Replay</Button></Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>
    </div>
  );
}
