import { useActionState } from "react";
import { Shield } from "lucide-react";
import { PageHeader, SectionCard, KpiCard, Field, SubmitButton, Button, inputClass, Table, Tr, Td, StatusBadge, demoSuccess } from "@/shared/observe";

const MAPPINGS = [
  { attr: "email", source: "NameID" },
  { attr: "firstName", source: "given_name" },
  { attr: "lastName", source: "family_name" },
  { attr: "role", source: "groups" },
];

export default function SsoPage() {
  const [, saveAction] = useActionState(async () => {
    await new Promise((r) => setTimeout(r, 700));
    demoSuccess("SSO configuration saved");
    return { ok: true };
  }, { ok: false });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="SSO"
        description="Single sign-on configuration and management."
        actions={<Button variant="secondary" onClick={() => demoSuccess("Test connection succeeded")}>Test connection</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Status" value="Enabled" icon={Shield} trend="up" />
        <KpiCard label="Protocol" value="SAML 2.0" />
        <KpiCard label="Provider" value="Okta" />
        <KpiCard label="SSO logins (30d)" value="412" />
      </div>

      <SectionCard title="Provider configuration">
        <form action={saveAction} className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Entity ID"><input defaultValue="https://acme.okta.com" className={inputClass} /></Field>
          <Field label="SSO URL"><input defaultValue="https://acme.okta.com/sso/saml" className={inputClass} /></Field>
          <div className="sm:col-span-2"><Field label="x509 certificate"><input defaultValue="-----BEGIN CERTIFICATE-----" className={inputClass} /></Field></div>
          <div className="sm:col-span-2"><SubmitButton>Save configuration</SubmitButton></div>
        </form>
      </SectionCard>

      <SectionCard title="Attribute mapping" className="p-0">
        <Table headers={["Pulse attribute", "IdP source", "Status"]}>
          {MAPPINGS.map((m) => (
            <Tr key={m.attr}>
              <Td className="font-[family-name:var(--mono)] text-[12px]">{m.attr}</Td>
              <Td className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{m.source}</Td>
              <Td><StatusBadge status="active" /></Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>
    </div>
  );
}
