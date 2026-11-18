import { useState, useId, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button as UiButton } from "@/components/ui/button";
import { Notice } from "@/shared/ui/pulse";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { projectPath } from "@/modules/projects/navigation/project-routes";
import { useProjectMutations } from "@/modules/projects/hooks/useProjects";
import type { CreateProjectBody, Project } from "@/modules/projects/api/types";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { ApiKeyRevealModal, type RevealedSecret } from "@/modules/projects/components/ApiKeyRevealModal";

// ── Constants & Helpers ──────────────────────────────────────────

const FIXED_TIMEZONE = "Asia/Kolkata";

function toKebabSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (project: Project) => void;
  navigateOnSuccess?: boolean;
}

/**
 * Minimal Enterprise Create Project Dialog.
 *
 * Distilled to its essence: clean, fast, distraction-free modal
 * with only the necessary inputs and smart defaults.
 */
export function CreateProjectDialog({
  open,
  onOpenChange,
  onSuccess,
  navigateOnSuccess = false,
}: CreateProjectDialogProps) {
  const navigate = useNavigate();
  const { createProject } = useProjectMutations();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealedSecret | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  const nameInputId = useId();
  const descInputId = useId();

  // Reset form state on open
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setError(null);
      setRevealed(null);
      idempotencyKeyRef.current = null;
    }
  }, [open]);

  const slugPreview = toKebabSlug(name);
  const isPending = createProject.isPending;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setError("Please provide a project name.");
      return;
    }

    const cleanDesc = description.trim();

    const payload: CreateProjectBody = {
      name: cleanName,
      timezone: FIXED_TIMEZONE,
      ...(cleanDesc ? { description: cleanDesc } : {}),
    };

    try {
      idempotencyKeyRef.current ??= crypto.randomUUID();
      const result = await createProject.mutateAsync({
        payload,
        idempotencyKey: idempotencyKeyRef.current,
      });
      const createdProject = result.project;

      // Automatically update active project in the organization store
      useOrgStore.getState().setActiveProjectId(createdProject.id);
      useOrgStore.getState().setActiveProjectSlug(createdProject.slug);

      toast.success("Project created", {
        description: `“${createdProject.name}” is ready for telemetry.`,
        action: {
          label: "View project",
          onClick: () => {
            const orgSlug = useOrgStore.getState().activeOrgSlug;
            if (orgSlug) {
              navigate(projectPath(orgSlug, createdProject.publicId, "overview"));
            } else {
              navigate(`/projects/${createdProject.id}/overview`);
            }
          },
        },
      });

      if (onSuccess) {
        onSuccess(createdProject);
      }

      setRevealed({
        value: result.fullKey,
        label: result.apiKey.name ?? result.apiKey.publicKey,
        keyName: result.apiKey.name ?? undefined,
        publicKey: result.apiKey.publicKey,
        environmentName: result.environment.name,
        environmentType: result.environment.type,
      });
    } catch (mutationError) {
      setError(apiErrorMessage(mutationError, "Could not create project. Please verify inputs and try again."));
    }
  };

  const closeReveal = () => {
    const createdProject = createProject.data?.project;
    setRevealed(null);
    onOpenChange(false);

    if (navigateOnSuccess && createdProject) {
      const orgSlug = useOrgStore.getState().activeOrgSlug;
      navigate(
        orgSlug
          ? projectPath(orgSlug, createdProject.publicId, "overview")
          : `/projects/${createdProject.id}/overview`,
      );
    }
  };

  return (
    <>
    <Dialog
      open={open && !revealed}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next);
      }}
    >
      <DialogContent
        className="w-full max-w-[calc(100vw-2rem)] sm:max-w-[460px] p-6 gap-5 border-[var(--border)] bg-[var(--bg1)] shadow-[var(--shadow-modal)]"
        showCloseButton={!isPending}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Header */}
          <DialogHeader className="gap-1 text-left">
            <DialogTitle className="text-[17px] font-semibold text-[var(--text)] tracking-tight">
              Create project
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[var(--text3)]">
              A project groups your telemetry, environments, and alerts.
            </DialogDescription>
          </DialogHeader>

          {/* Body fields */}
          <div className="flex flex-col gap-4">
            {/* Project Name */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={nameInputId}
                className="text-[13px] font-medium text-[var(--text)]"
              >
                Project name
              </label>
              <input
                id={nameInputId}
                name="name"
                required
                maxLength={255}
                autoFocus
                autoComplete="off"
                disabled={isPending}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  idempotencyKeyRef.current = null;
                }}
                placeholder="e.g. checkout-service"
                className="h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-3 text-[13px] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text3)] hover:border-[var(--border2)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-bg)] disabled:opacity-60"
              />
              {slugPreview ? (
                <p className="font-mono text-[11px] text-[var(--text3)] truncate">
                  Slug: <span className="text-[var(--text2)]">{slugPreview}</span>
                </p>
              ) : null}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={descInputId}
                className="text-[13px] font-medium text-[var(--text)]"
              >
                Description{" "}
                <span className="text-[11.5px] font-normal text-[var(--text3)]">
                  (optional)
                </span>
              </label>
              <textarea
                id={descInputId}
                name="description"
                maxLength={5000}
                rows={2}
                disabled={isPending}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  idempotencyKeyRef.current = null;
                }}
                placeholder="What does this service do?"
                className="w-full resize-none rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] p-2.5 text-[13px] leading-[1.5] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text3)] hover:border-[var(--border2)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-bg)] disabled:opacity-60"
              />
            </div>

            {/* Error Notice */}
            {error && (
              <div role="alert" className="animate-in fade-in-50 duration-150">
                <Notice tone="red" icon={AlertTriangle} title="Could not create project">
                  {error}
                </Notice>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <DialogFooter className="flex items-center justify-end gap-2 pt-1 -mx-0 -mb-0 bg-transparent border-t-0 p-0 sm:justify-end">
            <UiButton
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </UiButton>
            <UiButton
              type="submit"
              size="sm"
              disabled={!name.trim() || isPending}
              className="min-w-[100px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />
                  Creating…
                </>
              ) : (
                "Create project"
              )}
            </UiButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <ApiKeyRevealModal revealed={revealed} onClose={closeReveal} />
    </>
  );
}
