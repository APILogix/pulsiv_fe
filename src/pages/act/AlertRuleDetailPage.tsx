import { useActionState } from "react";
import { useParams, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { useAlertRule } from "@/hooks/useDummyData";
import {
  PageHeader, SectionCard, Field, SubmitButton, Button, inputClass, MetricSparkline, SeverityBadge, demoSuccess,
} from "@/shared/observe";

const schema = z.object({
  name: z.string().min(1, "Required"),
  threshold: z.coerce.number().min(0, "Must be positive"),
  window: z.string().min(1, "Required"),
});
type FormData = z.infer<typeof schema>;

export default function AlertRuleDetailPage() {
  const { ruleId = "" } = useParams();
  const navigate = useNavigate();
  const { data: rule, isLoading } = useAlertRule(ruleId);

  const { register, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    values: rule ? { name: rule.name, threshold: rule.threshold ?? 0, window: rule.window } : undefined,
  });

  const [, saveAction] = useActionState(async () => {
    await new Promise((r) => setTimeout(r, 700));
    demoSuccess("Alert rule saved");
    return { ok: true };
  }, { ok: false });

  if (isLoading) return <div className="p-8 text-[var(--text3)]">Loading rule…</div>;
  if (!rule) return <div className="p-8 text-[var(--text2)]">Rule not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back to rules</Button>
      <PageHeader
        title={rule.name}
        breadcrumbs={[{ label: "Act" }, { label: "Alert rules" }, { label: rule.name }]}
        actions={<SeverityBadge severity={rule.severity} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Configuration">
          <form action={saveAction} className="flex flex-col gap-4">
            <Field label="Rule name" error={errors.name?.message}><input {...register("name")} className={inputClass} /></Field>
            <Field label="Threshold" error={errors.threshold?.message}><input type="number" {...register("threshold")} className={inputClass} /></Field>
            <Field label="Window" error={errors.window?.message}><input {...register("window")} className={inputClass} /></Field>
            <div><SubmitButton>Save rule</SubmitButton></div>
          </form>
        </SectionCard>

        <SectionCard title="Preview">
          <p className="mb-3 text-[13px] text-[var(--text2)]">Recent metric values against the configured threshold ({rule.threshold ?? "anomaly"}).</p>
          <MetricSparkline data={Array.from({ length: 40 }, () => Math.random() * 100)} color="var(--amber)" width={460} height={120} />
        </SectionCard>
      </div>
    </div>
  );
}
