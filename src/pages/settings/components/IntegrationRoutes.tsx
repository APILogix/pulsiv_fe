import { useState } from "react";
import { Plus, Trash2, Webhook, Loader2 } from "lucide-react";
import { useConnectorRoutes, useSlackChannels, useConnectorMutations } from "@/modules/organizations/hooks/useConnectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { demoSuccess } from "@/shared/observe";

interface IntegrationRoutesProps {
  integrationId: string;
  type: string;
}

export function IntegrationRoutes({ integrationId, type }: IntegrationRoutesProps) {
  const { data: routesData, isLoading: loadingRoutes } = useConnectorRoutes(integrationId);
  const { data: slackChannels, isLoading: loadingChannels } = useSlackChannels(integrationId);
  const { createRoute, deleteRoute } = useConnectorMutations();

  const [isCreating, setIsCreating] = useState(false);
  const [eventType, setEventType] = useState("*");
  const [severity, setSeverity] = useState("");
  const [environment, setEnvironment] = useState("");
  const [slackChannelId, setSlackChannelId] = useState("");

  const routes = routesData?.data ?? [];

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const payload: any = {
        eventType: eventType || "*",
        enabled: true,
      };
      if (severity) payload.severity = severity;
      if (environment) payload.environment = environment;
      
      await createRoute.mutateAsync({
        id: integrationId,
        payload
      });
      demoSuccess("Route created successfully");
      setEventType("*");
      setSeverity("");
      setEnvironment("");
      setSlackChannelId("");
    } catch (err: any) {
      demoSuccess(`Failed to create route: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm("Are you sure you want to delete this route?")) return;
    try {
      await deleteRoute.mutateAsync({ id: integrationId, routeId });
      demoSuccess("Route deleted");
    } catch (err: any) {
      demoSuccess(`Failed to delete route: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card>
        <CardHeader>
          <CardTitle>Routing Rules</CardTitle>
          <CardDescription>
            Configure which events should be sent to this integration based on event type, severity, and environment.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <form onSubmit={handleCreateRoute} className="flex flex-col md:flex-row gap-4 items-end bg-[var(--bg2)] p-4 rounded-xl border border-[var(--border)]">
            <div className="flex-1 space-y-1.5 w-full">
              <Label htmlFor="eventType">Event Type</Label>
              <Input 
                id="eventType" 
                placeholder="e.g. alert.created or *" 
                value={eventType} 
                onChange={e => setEventType(e.target.value)} 
                required 
              />
            </div>
            <div className="flex-1 space-y-1.5 w-full">
              <Label htmlFor="severity">Severity</Label>
              <select 
                id="severity"
                className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--bg1)] px-3 py-2 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                value={severity}
                onChange={e => setSeverity(e.target.value)}
              >
                <option value="">Any</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="flex-1 space-y-1.5 w-full">
              <Label htmlFor="env">Environment</Label>
              <select 
                id="env"
                className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--bg1)] px-3 py-2 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                value={environment}
                onChange={e => setEnvironment(e.target.value)}
              >
                <option value="">Any</option>
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
            
            {type === 'slack' && (
              <div className="flex-1 space-y-1.5 w-full">
                <Label htmlFor="channel">Slack Channel</Label>
                <select 
                  id="channel"
                  className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--bg1)] px-3 py-2 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  value={slackChannelId}
                  onChange={e => setSlackChannelId(e.target.value)}
                >
                  <option value="">Default Connector Channel</option>
                  {loadingChannels ? (
                    <option disabled>Loading channels...</option>
                  ) : (
                    slackChannels?.channels?.map((ch: any) => (
                      <option key={ch.id} value={ch.id}>#{ch.name}</option>
                    ))
                  )}
                </select>
              </div>
            )}
            
            <Button type="submit" disabled={isCreating}>
              {isCreating ? <Loader2 className="size-4 animate-spin mr-2" /> : <Plus className="size-4 mr-2" />}
              Add Rule
            </Button>
          </form>

          {loadingRoutes ? (
            <div className="py-8 text-center text-[var(--text2)] flex items-center justify-center">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : routes.length === 0 ? (
            <div className="py-8 text-center text-[var(--text2)] border border-dashed border-[var(--border)] rounded-xl bg-[var(--bg2)]/50">
              <Webhook className="size-8 mx-auto mb-3 text-[var(--text3)] opacity-50" />
              <p>No routing rules defined.</p>
              <p className="text-xs mt-1">This connector receives all events by default until rules are added.</p>
            </div>
          ) : (
            <div className="rounded-md border border-[var(--border)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg2)] border-b border-[var(--border)]">
                  <tr>
                    <th className="h-10 px-4 text-left font-medium text-[var(--text2)]">Event Type</th>
                    <th className="h-10 px-4 text-left font-medium text-[var(--text2)]">Severity</th>
                    <th className="h-10 px-4 text-left font-medium text-[var(--text2)]">Environment</th>
                    <th className="h-10 px-4 text-right font-medium text-[var(--text2)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route: any) => (
                    <tr key={route.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg2)]/50 transition-colors">
                      <td className="p-4 font-mono text-xs">{route.eventType}</td>
                      <td className="p-4 capitalize">{route.severity || <span className="text-[var(--text3)]">Any</span>}</td>
                      <td className="p-4 capitalize">{route.environment || <span className="text-[var(--text3)]">Any</span>}</td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRoute(route.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10">
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
