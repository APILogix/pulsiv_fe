import { useActionState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useIntegration } from "@/hooks/useDummyData";
import { PageHeader, SectionCard, StatusBadge, Field, SubmitButton, inputClass, Table, Tr, Td, Timestamp, demoSuccess, DetailSkeleton } from "@/shared/observe";

export default function IntegrationDetailPage() {
  const { integrationId = "" } = useParams();
  const navigate = useNavigate();
  const { data: i, isLoading } = useIntegration(integrationId);

  const [, saveAction] = useActionState(async () => {
    await new Promise((r) => setTimeout(r, 600));
    demoSuccess("Integration settings saved");
    return { ok: true };
  }, { ok: false });

  if (isLoading) return <DetailSkeleton />;
  if (!i) return <div className="p-8 text-[var(--text2)]">Integration not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[var(--text2)] hover:text-[var(--text)]"><ArrowLeft className="size-4" /> Back to integrations</button>
      <PageHeader
        title={i.name}
        breadcrumbs={[{ label: "Settings" }, { label: "Integrations" }, { label: i.name }]}
        actions={<StatusBadge status={i.status} />}
      />

      <SectionCard title="Configuration">
        <form action={saveAction} className="grid max-w-xl grid-cols-1 gap-4">
          {Object.entries(i.config).flatMap(([k, v]) => v ? [(
            <Field key={k} label={k}><input defaultValue={String(v)} className={inputClass} /></Field>
          )] : [])}
          <div><SubmitButton>Save settings</SubmitButton></div>
        </form>
      </SectionCard>

      <SectionCard title="Sync log" className="p-0">
        <Table headers={["Status", "Message", "Time"]}>
          {i.syncLog.map((s) => (
            <Tr key={s.timestamp}><Td><StatusBadge status={s.status} /></Td><Td className="text-[var(--text2)]">{s.message}</Td><Td><Timestamp value={s.timestamp} /></Td></Tr>
          ))}
        </Table>
      </SectionCard>
    </div>
  );
}
