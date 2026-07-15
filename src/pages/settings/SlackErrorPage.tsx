import { useNavigate } from "react-router";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { FillPage, PageHeader, SectionCard, Button } from "@/shared/observe";

export default function SlackErrorPage() {
  const navigate = useNavigate();

  return (
    <FillPage>
      <PageHeader
        title="Slack Integration Failed"
        description="We couldn't connect your Slack workspace."
      />

      <SectionCard className="max-w-xl text-center flex flex-col items-center justify-center p-12">
        <div className="flex size-16 bg-red-500/10 text-red-500 rounded-full items-center justify-center mb-6">
          <AlertTriangle className="size-8" />
        </div>
        
        <h3 className="text-xl font-medium text-[var(--text)] mb-2">
          Authorization Error
        </h3>
        <p className="text-[var(--text2)] mb-8">
          Slack denied the authorization request. This usually happens if you clicked "Cancel" on the permission screen, or if the Slack Workspace administrator has restricted app installations.
        </p>

        <Button variant="primary" onClick={() => navigate("/connectors/integrations")}>
          <ArrowLeft className="size-4 mr-2" />
          Back to Integrations
        </Button>
      </SectionCard>
    </FillPage>
  );
}
