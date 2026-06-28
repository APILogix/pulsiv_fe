import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import {
  PageHeader, SectionCard, Field, SubmitButton, Button, inputClass, textareaClass, demoSuccess, demoAction,
} from "@/shared/observe";

const schema = z.object({
  name: z.string().min(1, "Project name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  description: z.string().max(280, "Keep it under 280 characters").optional(),
});
type FormData = z.infer<typeof schema>;

const DEFAULTS: FormData = { name: "Pulse API", slug: "pulse-api", description: "Primary observability project for the API gateway service." };

export default function ProjectSettingsPage() {
  const { register, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: DEFAULTS,
  });

  // rules.md §4.1 — useActionState for submission status (no manual isSubmitting).
  const [, submitAction] = useActionState(async () => {
    await new Promise((r) => setTimeout(r, 800));
    demoSuccess("Project settings saved");
    return { success: true };
  }, { success: false });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Project Settings" description="Controls backed by current project CRUD endpoints." />

      <SectionCard title="General">
        <form action={submitAction} className="flex max-w-xl flex-col gap-4">
          <Field label="Name" error={errors.name?.message}>
            <input {...register("name")} className={inputClass} />
          </Field>
          <Field label="Slug" error={errors.slug?.message} hint="Used in API endpoints and URLs.">
            <input {...register("slug")} className={inputClass} />
          </Field>
          <Field label="Description" error={errors.description?.message}>
            <textarea {...register("description")} className={textareaClass} />
          </Field>
          <div><SubmitButton>Save changes</SubmitButton></div>
        </form>
      </SectionCard>

      <SectionCard title="Danger zone" className="border-[var(--red)]/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-[var(--text)]">Delete this project</div>
            <p className="text-[13px] text-[var(--text2)]">Permanently remove the project and all of its ingested data. This cannot be undone.</p>
          </div>
          <Button variant="danger" onClick={() => demoAction("Delete project")}><Trash2 className="size-4" /> Delete project</Button>
        </div>
      </SectionCard>
    </div>
  );
}
