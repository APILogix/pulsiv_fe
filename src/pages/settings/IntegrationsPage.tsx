import { useState } from "react";
import { useNavigate } from "react-router";
import { useConnectors, useConnectorTypes, useConnectorMutations } from "@/modules/organizations/hooks/useConnectors";
import { PageHeader, FillPage, StatusBadge, Timestamp, demoSuccess } from "@/shared/observe";
import { ConnectorIcon } from "@/shared/ui/connector-icon";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const { data: integrations, isLoading: loadingInstances } = useConnectors();
  const { data: types, isLoading: loadingTypes } = useConnectorTypes();
  const { createConnector, startSlackOAuth } = useConnectorMutations();
  
  const [activeTab, setActiveTab] = useState<"active" | "available">("active");
  const [selectedType, setSelectedType] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [name, setName] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    
    await createConnector.mutateAsync({
      name: name || selectedType.displayName,
      type: selectedType.type,
      config: formData
    });
    
    demoSuccess(`${selectedType.displayName} integration created!`);
    setSelectedType(null);
    setFormData({});
    setName("");
    setActiveTab("active");
  };

  // Compute available integrations by filtering out those already installed
  const installedTypes = new Set((integrations || []).map((i: any) => i.type));
  const availableTypes = (types || []).filter((t: any) => !installedTypes.has(t.type));

  const renderActive = () => {
    if (loadingInstances) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      );
    }
    
    if (integrations?.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-[var(--border)] rounded-xl bg-[var(--bg1)]">
          <div className="flex size-12 items-center justify-center rounded-full bg-[var(--bg2)] text-[var(--text2)] mb-4">
            <ConnectorIcon type="default" className="size-6" />
          </div>
          <h3 className="text-lg font-medium text-[var(--text)] mb-1">No active integrations</h3>
          <p className="text-sm text-[var(--text2)] mb-6 max-w-sm">Connect Pulse to your existing tools like Slack or Webhooks to start routing alerts.</p>
          <Button onClick={() => setActiveTab("available")}>Browse Catalog</Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations?.map((i: any) => (
          <Card key={i.id} className="flex flex-col justify-between">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--bg2)] text-[var(--text)]">
                  <ConnectorIcon type={i.type} className="size-5" />
                </div>
                <StatusBadge status={i.status} />
              </div>
              <CardTitle className="text-base">{i.name}</CardTitle>
              <CardDescription className="text-xs mt-1">
                Added <Timestamp value={i.createdAt} />
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="secondary" className="w-full" onClick={() => navigate(`/connectors/integrations/${i.id}`)}>
                Configure
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  const renderAvailable = () => {
    if (loadingTypes) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      );
    }

    if (availableTypes.length === 0) {
      return (
        <div className="py-12 text-center text-[var(--text2)]">
          You have installed all available integrations!
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableTypes.map((t: any) => (
          <Card key={t.type} className="flex flex-col justify-between">
            <CardHeader className="pb-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--bg2)] text-[var(--text)] mb-4">
                <ConnectorIcon type={t.type} className="size-5" />
              </div>
              <CardTitle className="text-base">{t.displayName}</CardTitle>
              <CardDescription className="text-xs mt-1 line-clamp-2">
                {t.description}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={async () => {
                  if (t.type === 'slack') {
                    try {
                      const res = await startSlackOAuth.mutateAsync();
                      window.location.href = res.data.data.url;
                    } catch (err) {
                      console.error(err);
                    }
                    return;
                  }
                  setSelectedType(t);
                  setName("");
                  setFormData({});
                }}
              >
                Connect {t.displayName}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <FillPage>
      <PageHeader title="Integrations" description="Connect Pulse to your existing tools and workflows." />

      {selectedType ? (
        <div className="flex flex-col gap-6 max-w-xl">
          <Button variant="ghost" onClick={() => setSelectedType(null)} className="self-start -ml-4 text-[var(--text2)]">
            ← Back to catalog
          </Button>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--bg2)] text-[var(--text)]">
                  <ConnectorIcon type={selectedType.type} className="size-5" />
                </div>
                <CardTitle>Add {selectedType.displayName}</CardTitle>
              </div>
              <CardDescription>Configure the connection details below.</CardDescription>
            </CardHeader>
            <CardContent>
              <form id="integration-form" onSubmit={handleCreate} className="flex flex-col gap-5">
                <div className="space-y-2">
                  <Label htmlFor="integration-name">Integration Name</Label>
                  <Input 
                    id="integration-name"
                    required 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder={`e.g. Production ${selectedType.displayName}`} 
                  />
                  <p className="text-xs text-[var(--text3)]">A friendly name for this connection in Pulse.</p>
                </div>
                {selectedType.configFields.map((field: any) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input
                      id={field.key}
                      type={field.secret ? 'password' : 'text'}
                      required={field.required}
                      value={formData[field.key] || ''}
                      onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </form>
            </CardContent>
            <CardFooter className="bg-[var(--bg2)] border-t border-[var(--border)] pt-4">
              <Button type="submit" form="integration-form" disabled={createConnector.isPending}>
                {createConnector.isPending ? 'Saving...' : 'Save Integration'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center border-b border-[var(--border)]">
            <button
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "active" 
                  ? "border-[var(--primary)] text-[var(--primary)]" 
                  : "border-transparent text-[var(--text2)] hover:text-[var(--text)]"
              }`}
              onClick={() => setActiveTab("active")}
            >
              Active Integrations
            </button>
            <button
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "available" 
                  ? "border-[var(--primary)] text-[var(--primary)]" 
                  : "border-transparent text-[var(--text2)] hover:text-[var(--text)]"
              }`}
              onClick={() => setActiveTab("available")}
            >
              Available Catalog
            </button>
          </div>

          <div className="pt-2">
            {activeTab === "active" ? renderActive() : renderAvailable()}
          </div>
        </div>
      )}
    </FillPage>
  );
}
