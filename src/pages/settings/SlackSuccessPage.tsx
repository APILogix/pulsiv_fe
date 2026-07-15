import { useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router";
import { useConnector, useSlackChannels, useConnectorMutations } from "@/modules/organizations/hooks/useConnectors";
import { PageHeader, FillPage } from "@/shared/observe";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ConnectorIcon } from "@/shared/ui/connector-icon";
import { CheckCircle2 } from "lucide-react";

export default function SlackSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { orgId } = useParams();
  const connectorId = searchParams.get("connectorId");
  
  const { data: connector, isLoading: loadingConnector } = useConnector(connectorId || "");
  const { data: channelsData, isLoading: loadingChannels } = useSlackChannels(connectorId || "");
  const { updateConnector } = useConnectorMutations();
  
  const [selectedChannel, setSelectedChannel] = useState("");
  const [saving, setSaving] = useState(false);

  if (!connectorId) {
    return (
      <FillPage>
        <PageHeader title="Slack Connected" description="Integration successful." />
        <div className="p-8 text-center text-[var(--text2)] border border-[var(--border)] rounded-xl bg-[var(--bg1)]">
          <p className="mb-4">Slack was connected successfully, but no connector ID was provided.</p>
          <Button variant="outline" onClick={() => navigate(`/connectors/integrations`)}>
            Return to Integrations
          </Button>
        </div>
      </FillPage>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel) return;
    
    setSaving(true);
    try {
      await updateConnector.mutateAsync({
        id: connectorId,
        payload: {
          config: {
            defaultChannel: selectedChannel,
          }
        }
      });
      navigate(`/connectors/integrations/${connectorId}`);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  const channels = channelsData?.channels || [];
  const teamName = connector?.metadata?.teamName || "your workspace";

  return (
    <FillPage className="items-center justify-center min-h-[calc(100vh-64px)] p-6">
      <Card className="w-full max-w-2xl shadow-lg border-[var(--border)]">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4 relative">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-[var(--bg2)] text-[var(--text)] border border-[var(--border)] shadow-sm">
              <ConnectorIcon type="slack" className="size-8" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full border-2 border-[var(--bg1)]">
              <CheckCircle2 className="size-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Slack Connected!</CardTitle>
          <CardDescription className="text-base mt-2">
            Successfully authenticated with <strong className="text-[var(--text)]">{teamName}</strong>.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {loadingConnector || loadingChannels ? (
            <div className="py-12 text-center text-[var(--text2)] flex flex-col items-center">
              <div className="size-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-4" />
              Loading your Slack channels...
            </div>
          ) : (
            <form id="slack-channel-form" onSubmit={handleSave} className="flex flex-col gap-5">
              <div className="bg-[var(--primary-light)] text-[var(--primary)] text-sm p-4 rounded-lg mb-2 flex flex-col gap-1">
                <span className="font-medium">Final step:</span>
                <span>Select the default channel where Pulse should send alert notifications.</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="channel">Default Channel</Label>
                <div className="relative">
                  <select
                    id="channel"
                    required
                    className="flex h-10 w-full items-center justify-between rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                    value={selectedChannel}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                  >
                    <option value="" disabled>Select a channel...</option>
                    {channels.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        #{c.name} {c.isPrivate ? " 🔒" : ""}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--text2)]">
                    <svg className="size-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                <p className="text-xs text-[var(--text3)] mt-2">
                  If you select a private channel, make sure you manually add the Pulse bot to that channel in Slack.
                </p>
              </div>
            </form>
          )}
        </CardContent>
        
        <CardFooter className="bg-[var(--bg2)] rounded-b-xl border-t border-[var(--border)] pt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => navigate('/connectors/integrations')}>Skip for now</Button>
          <Button type="submit" form="slack-channel-form" disabled={saving || !selectedChannel || loadingChannels}>
            {saving ? "Saving..." : "Save and Continue"}
          </Button>
        </CardFooter>
      </Card>
    </FillPage>
  );
}
