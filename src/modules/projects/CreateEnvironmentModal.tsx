import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { inputClass } from "@/shared/observe";
import { useProject, useProjectMutations } from "./hooks/useProjects";
import { useParams } from "react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function CreateEnvironmentModal({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { projectId = "" } = useParams();
  const { createEnvironment } = useProjectMutations();
  const { data: project } = useProject(projectId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const environment = formData.get("environment") as string;

      await createEnvironment.mutateAsync({ projectId, data: { environment } });
      setOpen(false);
      toast.success("Environment record refreshed successfully");
    } catch (err) {
      toast.error("Failed to create environment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 size-4" /> Create Environment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Environment</DialogTitle>
            <DialogDescription>
              The current backend schema exposes a single environment record derived from the project's default environment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="environment">Environment</Label>
              <select
                id="environment"
                name="environment"
                className={inputClass}
                required
                defaultValue={project?.defaultEnvironment ?? "development"}
              >
                <option value={project?.defaultEnvironment ?? "development"}>
                  {project?.defaultEnvironment ?? "development"}
                </option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Environment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
