import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Play, Power, PowerOff, CheckCircle2, Clock, MessageSquare, Trash2 } from "lucide-react";
import { useConnector, useConnectorMutations, useConnectorTestRuns } from "@/modules/organizations/hooks/useConnectors";
import { StatusBadge, Timestamp, demoSuccess, DetailSkeleton } from "@/shared/observe";
import { useState } from "react";
import { ConnectorIcon } from "@/shared/ui/connector-icon";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntegrationRoutes } from "./components/IntegrationRoutes";
import { IntegrationDeliveries } from "./components/IntegrationDeliveries";
import { IntegrationAudit } from "./components/IntegrationAudit";

export default function IntegrationDetailPage() {
  const { integrationId = "" } = useParams();
  const navigate = useNavigate();
  const { data: i, isLoading } = useConnector(integrationId, true);
  const { data: testRunsData } = useConnectorTestRuns(integrationId);
  const { testConnector, sendTest, enableConnector, disableConnector, deleteConnector } = useConnectorMutations();

  const [isTesting, setIsTesting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "routes" | "deliveries" | "audit">("overview");

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this integration?")) {
      try {
        await deleteConnector.mutateAsync(integrationId);
        demoSuccess("Integration deleted successfully");
        navigate("/connectors/integrations");
      } catch (err: any) {
        demoSuccess(`Failed to delete integration: ${err.message}`);
      }
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await testConnector.mutateAsync(integrationId);
      demoSuccess("Test connection successful!");
    } catch (err: any) {
      demoSuccess(`Test failed: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendMessage = async () => {
    setIsSending(true);
    try {
      await sendTest.mutateAsync({
        id: integrationId,
        payload: {
          title: "Pulse Integration Test Successful",
          body: "Hello! This is a test message from Pulse. Your integration is correctly configured and ready to receive real alerts."
        }
      });
      demoSuccess("Test message sent successfully!");
    } catch (err: any) {
      demoSuccess(`Failed to send message: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleState = async () => {
    const isActive = i?.status === 'active';
    if (isActive) {
      await disableConnector.mutateAsync(integrationId);
      demoSuccess("Connector disabled");
    } else {
      await enableConnector.mutateAsync(integrationId);
      demoSuccess("Connector enabled");
    }
  };

  if (isLoading) return <DetailSkeleton />;
  if (!i) return <div className="p-8 text-[var(--text2)]">Integration not found.</div>;

  const testRuns = testRunsData?.data ?? [];
  const displayConfig = i.displayConfig || {};

  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[var(--text2)] hover:text-[var(--text)] transition-colors">
        <ArrowLeft className="size-4" /> Back to integrations
      </button>
      
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-xl bg-[var(--bg2)] text-[var(--text)] border border-[var(--border)] shadow-sm">
            <ConnectorIcon type={i.type} className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)] flex items-center gap-3">
              {i.name}
              <StatusBadge status={i.status} />
            </h1>
            <p className="text-sm text-[var(--text2)] mt-1 capitalize">{i.type} Integration</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSendMessage} disabled={isSending || i.status !== 'active'}>
            <MessageSquare className="size-4 mr-2" />
            {isSending ? "Sending..." : "Send Message"}
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={isTesting}>
            <Play className="size-4 mr-2" />
            {isTesting ? "Testing..." : "Test Connection"}
          </Button>
          <Button variant={i.status === 'active' ? 'secondary' : 'default'} onClick={handleToggleState}>
            {i.status === 'active' ? <><PowerOff className="size-4 mr-2" /> Disable</> : <><Power className="size-4 mr-2" /> Enable</>}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteConnector.isPending}>
            <Trash2 className="size-4 mr-2" /> {deleteConnector.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      <div className="flex items-center border-b border-[var(--border)] mt-2">
        {(["overview", "routes", "deliveries", "audit"] as const).map(tab => (
          <button
            key={tab}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab 
                ? "border-[var(--primary)] text-[var(--primary)]" 
                : "border-transparent text-[var(--text2)] hover:text-[var(--text)]"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "routes" && i.type === "slack" ? "Channels & Routing" : tab}
          </button>
        ))}
      </div>

      <div className="pt-2">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuration Settings</CardTitle>
                  <CardDescription>
                    Public connection settings for this integration. Sensitive tokens are stored encrypted and are not displayed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    {Object.keys(displayConfig).length === 0 ? (
                      <div className="text-sm text-[var(--text2)] py-4 border-t border-[var(--border)]">
                        No public configuration details to display.
                      </div>
                    ) : (
                      Object.entries(displayConfig).map(([key, value]) => (
                        <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-t border-[var(--border)]">
                          <div className="text-sm font-medium text-[var(--text)] capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className="text-sm text-[var(--text2)] mt-1 sm:mt-0">
                            {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                          </div>
                        </div>
                      ))
                    )}
                    
                    {i.metadata?.teamName && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-t border-[var(--border)]">
                        <div className="text-sm font-medium text-[var(--text)]">Workspace</div>
                        <div className="text-sm text-[var(--text2)] mt-1 sm:mt-0 flex items-center gap-2">
                          <Badge variant="outline">{i.metadata.teamName}</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Test Runs</CardTitle>
                  <CardDescription>History of connection tests and their latency.</CardDescription>
                </CardHeader>
                <CardContent>
                  {testRuns.length === 0 ? (
                    <div className="py-8 text-center text-[var(--text2)] flex flex-col items-center">
                      <Clock className="size-8 mb-3 text-[var(--text3)]" />
                      <p>No test runs executed yet.</p>
                      <p className="text-xs mt-1">Click 'Test Connection' above to verify connectivity.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {testRuns.map((run: any, idx: number) => (
                        <div key={run.id} className={`flex items-center justify-between py-3 ${idx > 0 ? 'border-t border-[var(--border)]' : ''}`}>
                          <div className="flex items-center gap-3">
                            {run.status === 'healthy' || run.status === 'success' ? (
                              <CheckCircle2 className="size-4 text-green-500" />
                            ) : (
                              <div className="size-2 rounded-full bg-red-500 ml-1 mr-1" />
                            )}
                            <span className="text-sm text-[var(--text)] capitalize">{run.status}</span>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-[var(--text2)]">
                            <span>{run.durationMs ? `${run.durationMs}ms` : '-'}</span>
                            <Timestamp value={run.createdAt} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1 flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Integration Details</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 text-sm">
                  <div>
                    <div className="text-[var(--text3)] mb-1 text-xs uppercase tracking-wider font-semibold">Created At</div>
                    <div className="font-medium text-[var(--text)]"><Timestamp value={i.createdAt} /></div>
                  </div>
                  <div>
                    <div className="text-[var(--text3)] mb-1 text-xs uppercase tracking-wider font-semibold">Last Delivery</div>
                    <div className="font-medium text-[var(--text)]">{i.health?.lastSuccessfulDeliveryAt ? <Timestamp value={i.health.lastSuccessfulDeliveryAt} /> : 'Never'}</div>
                  </div>
                  <div>
                    <div className="text-[var(--text3)] mb-1 text-xs uppercase tracking-wider font-semibold">Connector ID</div>
                    <div className="font-mono text-xs text-[var(--text2)] break-all bg-[var(--bg2)] p-1.5 rounded">{i.id}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "routes" && (
          <IntegrationRoutes integrationId={i.id} type={i.type} />
        )}

        {activeTab === "deliveries" && (
          <IntegrationDeliveries integrationId={i.id} />
        )}

        {activeTab === "audit" && (
          <IntegrationAudit integrationId={i.id} />
        )}
      </div>
    </div>
  );
}
