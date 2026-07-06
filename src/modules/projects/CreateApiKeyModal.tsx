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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inputClass } from "@/shared/observe";
import { useProjectMutations } from "./hooks/useProjects";
import { useParams } from "react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function CreateApiKeyModal({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { projectId = "" } = useParams();
  const { createApiKey } = useProjectMutations();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get("name") as string;
      const keyType = formData.get("keyType") as string;
      const environment = formData.get("environment") as string;

      await createApiKey.mutateAsync({ projectId, data: { name, keyType, environment } });
      setOpen(false);
      toast.success("API Key generated successfully");
    } catch (err) {
      toast.error("Failed to generate API Key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 size-4" /> Create Key
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new key for ingestion or platform access.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input id="key-name" name="name" placeholder="e.g. Production Ingest Key" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="key-type">Type</Label>
              <select id="key-type" name="keyType" className={inputClass} required defaultValue="standard">
                <option value="standard">Standard</option>
                <option value="ingestion_only">Ingestion only</option>
                <option value="read_only">Read-only</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="env-select">Environment</Label>
              <select id="env-select" name="environment" className={inputClass} required defaultValue="production">
                <option value="production">Production</option>
                <option value="staging">Staging</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Generating..." : "Generate Key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
