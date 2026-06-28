import { useActionState } from "react";
import { Building2 } from "lucide-react";
import { PageHeader, SectionCard, KpiCard, Field, SubmitButton, Button, inputClass, demoSuccess, demoAction } from "@/shared/observe";

export default function OrgProfilePage() {
  const [, saveAction] = useActionState(async () => {
    await new Promise((r) => setTimeout(r, 700));
    demoSuccess("Organization profile saved");
    return { ok: true };
  }, { ok: false });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Organization Profile" description="Organization identity, ownership, and base settings." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Members" value="25" icon={Building2} />
        <KpiCard label="Projects" value="12" />
        <KpiCard label="Plan" value="Team" />
        <KpiCard label="Created" value="Jan 2025" />
      </div>

      <SectionCard title="Identity">
        <form action={saveAction} className="flex max-w-xl flex-col gap-4">
          <Field label="Organization name"><input defaultValue="Acme Corp" className={inputClass} /></Field>
          <Field label="Slug" hint="Used in URLs and SSO endpoints."><input defaultValue="acme-corp" className={inputClass} /></Field>
          <Field label="Billing email"><input type="email" defaultValue="billing@acme.com" className={inputClass} /></Field>
          <div><SubmitButton>Save profile</SubmitButton></div>
        </form>
      </SectionCard>

      <SectionCard title="Ownership transfer" className="border-[var(--amber)]/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-[var(--text)]">Transfer ownership</div>
            <p className="text-[13px] text-[var(--text2)]">Hand over organization ownership to another admin. Requires confirmation.</p>
          </div>
          <Button variant="secondary" onClick={() => demoAction("Transfer ownership")}>Transfer</Button>
        </div>
      </SectionCard>
    </div>
  );
}
