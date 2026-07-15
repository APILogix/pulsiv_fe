import { useState } from "react";
import { useNavigate } from "react-router";
import { useProjectMutations } from "@/modules/projects/hooks/useProjects";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export default function CreateProjectWizardPage() {
  const navigate = useNavigate();
  const { createProject } = useProjectMutations();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const result = await createProject.mutateAsync({
        name,
        description,
        environment: "development",
      });
      toast.success("Project created successfully");
      navigate(`/projects/${result.id}`);
    } catch {
      toast.error("Failed to create project");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] h-full items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
            <CardDescription>
              Create a new project to start tracking your events.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production API"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of this project..."
                rows={3}
              />
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Default Environment</h4>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    Each project stores a single default environment in the current schema.
                    This project will be created with `development` as its default environment.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/projects")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name || loading}
            >
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
