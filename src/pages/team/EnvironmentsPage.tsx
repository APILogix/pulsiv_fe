import { useActionState } from "react";
import { useNavigate } from "react-router";
import { useEnvironments } from "@/hooks/useDummyData";
import {
  PageHeader, SectionCard, Field, SubmitButton, inputClass, formatCompact, demoSuccess,
} from "@/shared/observe";

export default function EnvironmentsPage() {
  const navigate = useNavigate();
  const { data } = useEnvironments();
  const envs = data ?? [];

  const [, createAction] = useActionState(async (_p: unknown, form: FormData) => {
    await new Promise((r) => setTimeout(r, 600));
    demoSuccess(`Environment "${form.get("name")}" created`);
    return { ok: true };
  }, { ok: false });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Environments" description="Environment management across org contexts." />

      <SectionCard title="Create environment">
        <form action={createAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1"><Field label="Name"><input name="name" required placeholder="e.g. Pre-production" className={inputClass} /></Field></div>
          <div className="w-40"><Field label="Retention (days)"><input name="retention" type="number" defaultValue={30} className={inputClass} /></Field></div>
          <SubmitButton>Create</SubmitButton>
        </form>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {envs.map((e) => (
          <div key={e.id} onClick={() => navigate(`/admin/environments/${e.id}`)} className="cursor-pointer rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4 hover:border-[var(--input)]">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full" style={{ background: e.color }} />
              <span className="font-semibold text-[var(--text)]">{e.name}</span>
            </div>
            <code className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">{e.slug}</code>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-3 text-center">
              <Stat label="Projects" value={String(e.projectCount)} />
              <Stat label="Events" value={formatCompact(e.eventVolume24h)} />
              <Stat label="Retention" value={`${e.retentionDays}d`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-semibold tabular-nums text-[var(--text)]">{value}</div>
      <div className="text-[11px] text-[var(--text3)]">{label}</div>
    </div>
  );
}
