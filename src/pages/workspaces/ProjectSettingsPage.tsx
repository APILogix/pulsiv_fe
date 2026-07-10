import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useProjectMutations, useProjectSettings } from "@/modules/projects/hooks/useProjects";
import { Button } from "@/shared/observe";
import { Field, FillPage, PageHeader, SectionCard, inputClass, textareaClass } from "@/shared/observe";
import { toast } from "sonner";
import { useCurrentProject } from "./ProjectShellPage";

const generalSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().max(5000, "Keep it under 5000 characters").nullable().optional(),
});

const advancedSchema = z.object({
  retentionDays: z.number().min(1).max(365),
  maxEventsPerSecond: z.number().min(100),
  autoArchive: z.boolean(),
  alertingEnabled: z.boolean(),
  ingestionEnabled: z.boolean(),
});

type GeneralFormData = z.infer<typeof generalSchema>;
type AdvancedFormData = z.infer<typeof advancedSchema>;

export default function ProjectSettingsPage() {
  const navigate = useNavigate();
  const { project, projectId } = useCurrentProject();
  const { updateProject, deleteProject, updateSettings } = useProjectMutations();
  
  const { data: settings } = useProjectSettings(projectId);

  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingAdvanced, setSavingAdvanced] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register: registerGeneral,
    handleSubmit: handleGeneralSubmit,
    reset: resetGeneral,
    formState: { errors: generalErrors },
  } = useForm<GeneralFormData>({
    resolver: zodResolver(generalSchema),
    mode: "onBlur",
    defaultValues: { name: "", description: "" },
  });

  const {
    register: registerAdvanced,
    handleSubmit: handleAdvancedSubmit,
    reset: resetAdvanced,
    formState: { errors: advancedErrors },
  } = useForm<AdvancedFormData>({
    resolver: zodResolver(advancedSchema),
    mode: "onBlur",
    defaultValues: {
      retentionDays: 30,
      maxEventsPerSecond: 1000,
      autoArchive: false,
      alertingEnabled: true,
      ingestionEnabled: true,
    },
  });

  useEffect(() => {
    if (!project) return;
    resetGeneral({
      name: project.name,
      description: project.description ?? "",
    });
  }, [project, resetGeneral]);

  useEffect(() => {
    if (!settings) return;
    resetAdvanced({
      retentionDays: settings.retentionDays,
      maxEventsPerSecond: settings.maxEventsPerSecond,
      autoArchive: settings.autoArchive,
      alertingEnabled: settings.alertingEnabled,
      ingestionEnabled: settings.ingestionEnabled,
    });
  }, [settings, resetAdvanced]);

  const onGeneralSubmit = handleGeneralSubmit(async (data) => {
    if (!project) return;
    setSavingGeneral(true);
    try {
      await updateProject.mutateAsync({
        id: project.id,
        data: {
          name: data.name,
          description: data.description?.trim() ? data.description : null,
        },
      });
      toast.success("General settings saved");
    } catch {
      toast.error("Failed to save general settings");
    } finally {
      setSavingGeneral(false);
    }
  });

  const onAdvancedSubmit = handleAdvancedSubmit(async (data) => {
    if (!project) return;
    setSavingAdvanced(true);
    try {
      await updateSettings.mutateAsync({
        id: project.id,
        data,
      });
      toast.success("Advanced settings saved");
    } catch {
      toast.error("Failed to save advanced settings");
    } finally {
      setSavingAdvanced(false);
    }
  });

  const handleDelete = async () => {
    if (!project) return;
    setDeleting(true);
    try {
      await deleteProject.mutateAsync(project.id);
      toast.success("Project archived");
      navigate("/projects");
    } catch {
      toast.error("Failed to archive project");
      setDeleting(false);
    }
  };

  return (
    <FillPage className="flex flex-col gap-6">
      <PageHeader
        title="Project Settings"
        description={\`Manage project metadata and lifecycle controls.\${project ? \` Default environment: \${project.defaultEnvironment}.\` : ""}\`}
      />
      <div className="sidebar-scroll flex-1 overflow-y-auto">
        <div className="flex max-w-[800px] flex-col gap-8 pb-12">
          
          <SectionCard title="General Settings">
            <form onSubmit={onGeneralSubmit} className="flex flex-col gap-5">
              <Field label="Name" error={generalErrors.name?.message}>
                <input {...registerGeneral("name")} className={inputClass} />
              </Field>
              <Field label="Slug" hint="Slug is generated on creation and is not editable in the current schema.">
                <input value={project?.slug ?? ""} className={inputClass} disabled readOnly />
              </Field>
              <Field label="Description" error={generalErrors.description?.message}>
                <textarea {...registerGeneral("description")} className={textareaClass} rows={4} />
              </Field>
              <div className="pt-2">
                <Button type="submit" variant="primary" disabled={savingGeneral}>
                  {savingGeneral ? "Saving..." : "Save General Changes"}
                </Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Advanced Settings">
            <form onSubmit={onAdvancedSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Retention Days" error={advancedErrors.retentionDays?.message} hint="How long events are stored.">
                  <input type="number" {...registerAdvanced("retentionDays", { valueAsNumber: true })} className={inputClass} />
                </Field>
                <Field label="Rate Limit (events/sec)" error={advancedErrors.maxEventsPerSecond?.message} hint="Max burst per second.">
                  <input type="number" {...registerAdvanced("maxEventsPerSecond", { valueAsNumber: true })} className={inputClass} />
                </Field>
              </div>
              
              <div className="flex flex-col gap-3 mt-2">
                <label className="flex items-center gap-3">
                  <input type="checkbox" {...registerAdvanced("ingestionEnabled")} className="w-4 h-4 rounded border-[var(--border)] text-[var(--brand)] focus:ring-[var(--brand)]" />
                  <div>
                    <div className="text-[14px] font-medium text-[var(--text)]">Enable Ingestion</div>
                    <div className="text-[12px] text-[var(--text2)]">Allow events and telemetry to be ingested</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-3">
                  <input type="checkbox" {...registerAdvanced("alertingEnabled")} className="w-4 h-4 rounded border-[var(--border)] text-[var(--brand)] focus:ring-[var(--brand)]" />
                  <div>
                    <div className="text-[14px] font-medium text-[var(--text)]">Enable Alerting</div>
                    <div className="text-[12px] text-[var(--text2)]">Process alert rules and send notifications</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-3">
                  <input type="checkbox" {...registerAdvanced("autoArchive")} className="w-4 h-4 rounded border-[var(--border)] text-[var(--brand)] focus:ring-[var(--brand)]" />
                  <div>
                    <div className="text-[14px] font-medium text-[var(--text)]">Auto Archive</div>
                    <div className="text-[12px] text-[var(--text2)]">Automatically archive this project if inactive for 90 days</div>
                  </div>
                </label>
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" disabled={savingAdvanced}>
                  {savingAdvanced ? "Saving..." : "Save Advanced Settings"}
                </Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Danger Zone" className="border border-[var(--red)]/20 bg-[var(--red)]/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14px] font-medium text-[var(--text)]">Archive this project</div>
                <p className="mt-1 text-[13px] text-[var(--text2)]">
                  This uses the project soft-delete flow and revokes active project API keys.
                </p>
              </div>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                <Trash2 className="mr-2 size-4" /> {deleting ? "Archiving..." : "Archive Project"}
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>
    </FillPage>
  );
}
