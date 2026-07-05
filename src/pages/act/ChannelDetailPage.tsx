import { useActionState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Send } from "lucide-react";
import { useChannel } from "@/hooks/useDummyData";
import { PageHeader, SectionCard, StatusBadge, Field, SubmitButton, Button, inputClass, Table, Tr, Td, StatusCodeBadge, Timestamp, demoSuccess, DetailSkeleton } from "@/shared/observe";

export default function ChannelDetailPage() {
  const { channelId = "" } = useParams();
  const navigate = useNavigate();
  const { data: c, isLoading } = useChannel(channelId);

  const [, saveAction] = useActionState(async () => {
    await new Promise((r) => setTimeout(r, 600));
    demoSuccess("Channel configuration saved");
    return { ok: true };
  }, { ok: false });

  if (isLoading) return <DetailSkeleton />;
  if (!c) return <div className="p-8 text-[var(--text2)]">Channel not found.</div>;

  const deliveries = Array.from({ length: 8 }, (_, i) => ({
    id: i, ts: Date.now() - i * 5400000, code: i === 2 && c.status === "failed" ? 500 : 200, event: c.events[i % c.events.length],
  }));

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back to channels</Button>
      <PageHeader
        title={c.name}
        breadcrumbs={[{ label: "Act" }, { label: "Channels" }, { label: c.name }]}
        actions={<><StatusBadge status={c.status} /><Button variant="secondary" onClick={() => demoSuccess("Test notification sent")}><Send className="size-4" /> Test</Button></>}
      />

      <SectionCard title="Configuration">
        <form action={saveAction} className="flex max-w-xl flex-col gap-4">
          <Field label="Channel name"><input defaultValue={c.name} className={inputClass} /></Field>
          <Field label="Destination" hint={`Type: ${c.type}`}><input defaultValue={c.destination} className={inputClass} /></Field>
          <div><SubmitButton>Save configuration</SubmitButton></div>
        </form>
      </SectionCard>

      <SectionCard title="Delivery log" className="p-0">
        <Table headers={["Event", "Status", "Time"]}>
          {deliveries.map((d) => (
            <Tr key={d.id}>
              <Td className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{d.event}</Td>
              <Td><StatusCodeBadge code={d.code} /></Td>
              <Td><Timestamp value={d.ts} /></Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>
    </div>
  );
}
