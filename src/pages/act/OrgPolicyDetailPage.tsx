import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Save, Shield, Code, Clock, AlertTriangle, History } from "lucide-react";
import { toast } from "sonner";
import { useOrganizationAlertPolicy, useOrganizationAlertPolicyMutations } from "@/modules/alerting/hooks/useAlerting";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { DetailSkeleton, SeverityBadge } from "@/shared/observe";

export default function OrgPolicyDetailPage() {
  const { policyId = "" } = useParams();
  const navigate = useNavigate();
  const { data: policy, isLoading } = useOrganizationAlertPolicy(policyId);
  const { createVersion } = useOrganizationAlertPolicyMutations();
  const [definition, setDefinition] = useState("{}");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (policy?.currentDefinition) setDefinition(JSON.stringify(policy.currentDefinition, null, 2));
  }, [policy]);

  if (isLoading) return <DetailSkeleton />;
  if (!policy) {
    return (
      <div className="mx-auto max-w-[800px] p-8 text-center text-[13px] text-[var(--text2)] space-y-3">
        <AlertTriangle className="mx-auto size-8 text-amber-400" />
        <div className="font-semibold text-[var(--text)]">Policy Not Found</div>
        <div>The requested policy ID does not exist or has been removed.</div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--text)] hover:border-[var(--brand)]"
        >
          <ArrowLeft className="size-4 shrink-0" />
          <span>Back to Policies</span>
        </button>
      </div>
    );
  }

  const saveVersion = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const parsed = JSON.parse(definition);
      createVersion.mutate(
        { policyId: policy.id, definition: parsed },
        {
          onSuccess: () => toast.success(`Version ${policy.currentVersion ? policy.currentVersion + 1 : 2} created`),
          onError: (requestError) => setError(apiErrorMessage(requestError, "Could not create policy version.")),
        }
      );
    } catch {
      setError("The policy definition must be valid JSON.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 p-6">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 self-start text-[12px] font-medium text-[var(--text3)] transition-colors hover:text-[var(--text)] cursor-pointer"
      >
        <ArrowLeft className="size-4 shrink-0" />
        <span>Back to policies</span>
      </button>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--brand)]/30 bg-[var(--brand)]/10 text-[var(--brand)]">
            <Shield className="size-5 shrink-0" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-[var(--text)] tracking-tight">{policy.name}</h1>
            <div className="flex items-center gap-2 font-[family-name:var(--mono)] text-[12px] text-[var(--text3)] mt-0.5">
              <span>{policy.slug}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-[var(--brand)] font-semibold">
                <History className="size-3 shrink-0" />
                Version {policy.currentVersion ?? policy.version ?? 1}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-3.5 space-y-1">
          <span className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-wider text-[var(--text3)] block">
            Category
          </span>
          <div className="font-medium text-[13px] capitalize text-[var(--text)]">{policy.category}</div>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-3.5 space-y-1">
          <span className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-wider text-[var(--text3)] block">
            Severity
          </span>
          <div>
            <SeverityBadge severity={policy.severity} />
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-3.5 space-y-1">
          <span className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-wider text-[var(--text3)] block">
            Metric Source
          </span>
          <div className="font-[family-name:var(--mono)] text-[12px] text-[var(--brand)] truncate">
            {policy.metricSource}
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-3.5 space-y-1">
          <span className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-wider text-[var(--text3)] block">
            Cooldown
          </span>
          <div className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--text)] font-[family-name:var(--mono)]">
            <Clock className="size-3.5 shrink-0 text-[var(--text3)]" />
            <span>{policy.cooldownSeconds}s</span>
          </div>
        </div>
      </div>

      {/* Form: New Immutable Version */}
      <form onSubmit={saveVersion} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <Code className="size-4 text-[var(--brand)] shrink-0" />
            <h3 className="text-[14px] font-semibold text-[var(--text)]">New Immutable Policy Version</h3>
          </div>
          <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
            JSON Schema Definition
          </span>
        </div>

        <textarea
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          className="min-h-[360px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4 font-[family-name:var(--mono)] text-[12px] text-[var(--text)] outline-none focus:border-[var(--brand)] leading-relaxed resize-y"
          spellCheck={false}
        />

        <p className="text-[12px] text-[var(--text3)]">
          Saving creates a new immutable policy version. Active projects using this policy can migrate gradually without breaking runtime evaluation.
        </p>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-[12px] text-red-400">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-[var(--border)]">
          <button
            type="submit"
            disabled={createVersion.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-[12px] font-medium text-[var(--bg)] shadow-xs transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50"
          >
            <Save className="size-4 shrink-0" />
            <span>{createVersion.isPending ? "Creating Version..." : "Create Immutable Version"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
