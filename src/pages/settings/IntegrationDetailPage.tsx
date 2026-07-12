import { useActionState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Plug } from "lucide-react";

import { useIntegration } from "@/hooks/useDummyData";
import {
  Button,
  DangerRow,
  DangerZone,
  demoSuccess,
  DetailSkeleton,
  Field,
  inputClass,
  MonospaceText,
  PageHeader,
  SectionCard,
  StatusBadge,
  SubmitButton,
  Table,
  Td,
  Timestamp,
  Tr,
} from "@/shared/observe";

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

  const configEntries = Object.entries(i.config).filter(([, v]) => v);
  const lastSync = i.syncLog[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => navigate(-1)}
        className="flex w-fit items-center gap-1.5 text-sm text-[var(--text2)] transition-colors hover:text-[var(--text)]"
      >
        <ArrowLeft className="size-4" /> Back to integrations
      </button>

      <PageHeader
        title={i.name}
        description="Manage connection settings and review sync activity."
        breadcrumbs={[{ label: "Settings" }, { label: "Integrations" }, { label: i.name }]}
        actions={<StatusBadge status={i.status} />}
      />

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_320px] lg:items-start">
        {/* ── Main column ── */}
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="Configuration">
            {configEntries.length > 0 ? (
              <form action={saveAction} className="grid max-w-xl grid-cols-1 gap-4">
                {configEntries.map(([k, v]) => (
                  <Field key={k} label={k}>
                    <input defaultValue={String(v)} className={inputClass} />
                  </Field>
                ))}
                <div>
                  <SubmitButton>Save settings</SubmitButton>
                </div>
              </form>
            ) : (
              <p className="text-[13px] text-[var(--text2)]">This integration has no configurable settings.</p>
            )}
          </SectionCard>

          <SectionCard title="Sync log">
            <Table headers={["Status", "Message", "Time"]}>
              {i.syncLog.map((s, idx) => (
                <Tr key={`${s.timestamp}-${idx}`}>
                  <Td>
                    <StatusBadge status={s.status} />
                  </Td>
                  <Td className="text-[var(--text2)]">{s.message}</Td>
                  <Td>
                    <Timestamp value={s.timestamp} />
                  </Td>
                </Tr>
              ))}
            </Table>
          </SectionCard>

          <DangerZone>
            <DangerRow
              label="Disconnect integration"
              description={`Stops all syncing between Pulse and ${i.name}. Configuration is preserved for reconnection.`}
              action={
                <Button variant="danger" onClick={() => demoSuccess(`${i.name} disconnected`)}>
                  Disconnect
                </Button>
              }
            />
          </DangerZone>
        </div>

        {/* ── Side rail ── */}
        <SectionCard title="Connection info">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[12px] text-[var(--text3)]">Integration ID</span>
              <MonospaceText value={i.id} className="text-[var(--text)]" />
            </div>
            <div className="h-px bg-[var(--border)]" />
            <div className="flex items-center justify-between gap-4">
              <span className="text-[12px] text-[var(--text3)]">Type</span>
              <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{i.type}</span>
            </div>
            <div className="h-px bg-[var(--border)]" />
            <div className="flex items-center justify-between gap-4">
              <span className="text-[12px] text-[var(--text3)]">Last sync</span>
              <span className="text-[12px]">
                <Timestamp value={i.lastSyncAt} />
              </span>
            </div>
            {lastSync && (
              <>
                <div className="h-px bg-[var(--border)]" />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[12px] text-[var(--text3)]">Last result</span>
                  <StatusBadge status={lastSync.status} />
                </div>
              </>
            )}
            <div className="h-px bg-[var(--border)]" />
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--text3)]">
              <Plug className="size-3.5" />
              Synced automatically every hour.
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
