import { useParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { PageHeader, SectionCard, KpiCard, Button, DetailSkeleton, Field, inputClass, SubmitButton } from "@/shared/observe";
import { toast } from "sonner";

export default function EnvironmentDetailPage() {
  const { envId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeOrgId } = useOrganizations();

  const { data: envs, isLoading } = useQuery({
    queryKey: orgQueryKeys.environments(activeOrgId!),
    queryFn: () => orgApi.listEnvironments(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const e = (envs || []).find(x => x.id === envId);

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; isProduction: boolean }) => orgApi.updateEnvironment(activeOrgId!, envId, data),
    onSuccess: () => {
      toast.success("Environment updated");
      queryClient.invalidateQueries({ queryKey: orgQueryKeys.environments(activeOrgId!) });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update")
  });

  if (isLoading) return <DetailSkeleton />;
  if (!e) return <div className="p-8 text-[var(--text2)]">Environment not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start">
        <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4 mr-2" /> Back to environments</Button>
      </div>
      
      <PageHeader
        title={e.name}
        breadcrumbs={[{ label: "Team" }, { label: "Environments" }, { label: e.name }]}
        actions={<span className="flex items-center gap-2 text-[13px] text-[var(--text2)]"><span className="size-3 rounded-full" style={{ background: e.isProduction ? 'var(--red)' : 'var(--blue)' }} /> {e.isProduction ? 'Production' : 'Development'}</span>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Status" value="Active" />
        <KpiCard label="Created" value={new Date(e.createdAt).toLocaleDateString()} />
      </div>

      <SectionCard title="Settings">
        <form 
          className="flex flex-col gap-5 max-w-md"
          onSubmit={(ev) => {
            ev.preventDefault();
            const formData = new FormData(ev.currentTarget);
            updateMutation.mutate({
              name: formData.get("name") as string,
              description: ((formData.get("description") as string) || "").trim() || undefined,
              isProduction: formData.get("isProduction") === "on",
            });
          }}
        >
          <Field label="Name">
            <input name="name" defaultValue={e.name} required className={inputClass} />
          </Field>
          <Field label="Description">
            <textarea name="description" defaultValue={e.description || ""} className={inputClass} rows={3} />
          </Field>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="isProduction" id="isProduction" defaultChecked={e.isProduction} />
            <label htmlFor="isProduction" className="text-sm text-[var(--text)]">Production Environment</label>
          </div>
          <div>
            <SubmitButton>Save Changes</SubmitButton>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
