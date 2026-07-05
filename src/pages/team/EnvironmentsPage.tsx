import { useActionState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import {
  PageHeader, SectionCard, Field, SubmitButton, inputClass,
} from "@/shared/observe";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function EnvironmentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();

  const { data: envs, isLoading } = useQuery({
    queryKey: orgQueryKeys.environments(activeOrgId!),
    queryFn: () => orgApi.listEnvironments(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const [state, createAction] = useActionState(
    async (_prevState: any, form: FormData) => {
      if (!activeOrgId) return { ok: false, error: "No active org" };
      try {
        const name = (form.get("name") as string)?.trim();
        const description = ((form.get("description") as string) || "").trim() || undefined;
        const isProduction = form.get("isProduction") === "on";
        await orgApi.createEnvironment(activeOrgId, { name, description, isProduction });
        queryClient.invalidateQueries({ queryKey: orgQueryKeys.environments(activeOrgId) });
        return { ok: true, name };
      } catch (err: any) {
        return { ok: false, error: err.response?.data?.message || "Failed to create environment" };
      }
    },
    { ok: false, error: null, name: undefined }
  );

  useEffect(() => {
    if (state.ok && state.name) {
      toast.success(`Environment "${state.name}" created`);
    }
    if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  if (isLoading) return <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" /></div>;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Environments" description="Environment management across org contexts." />

      <SectionCard title="Create environment">
        <form action={createAction} className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Name">
              <input name="name" required placeholder="e.g. Pre-production" className={inputClass} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea name="description" placeholder="Internal purpose or deployment notes" className={inputClass} rows={3} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--text)]">
            <input type="checkbox" name="isProduction" />
            Production environment
          </label>
          <div className="sm:col-span-2">
            <SubmitButton>Create</SubmitButton>
          </div>
        </form>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(envs || []).map((e) => (
          <div key={e.id} onClick={() => navigate(`/admin/environments/${e.id}`)} className="cursor-pointer rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4 hover:border-[var(--input)]">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full" style={{ background: e.isProduction ? 'var(--red)' : 'var(--blue)' }} />
              <span className="font-semibold text-[var(--text)]">{e.name}</span>
            </div>
            {e.description ? <p className="mt-2 text-sm text-[var(--text2)]">{e.description}</p> : null}
            <code className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)] mt-1 block">Created {new Date(e.createdAt).toLocaleDateString()}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
