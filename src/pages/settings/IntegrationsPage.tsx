import { useNavigate } from "react-router";
import { useConnectors } from "@/modules/organizations/hooks/useConnectors";
import { PageHeader, FillPage, InfiniteCards, StatusBadge, Button, Timestamp, demoSuccess } from "@/shared/observe";

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useConnectors();
  const integrations: any[] = data ?? [];

  return (
    <FillPage>
      <PageHeader title="Integrations" description="Connect Pulse to your existing tools." />

      <InfiniteCards
        className="flex-1"
        loading={isLoading}
        items={integrations}
        queryKey={["integrations"]}
        getKey={(i) => i.id}
        renderCard={(i) => (
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-[8px] bg-[var(--bg2)] font-semibold text-[var(--text2)]">{i.name.charAt(0)}</div>
                <span className="font-medium text-[var(--text)]">{i.name}</span>
              </div>
              <StatusBadge status={i.status} />
            </div>
            <div className="mt-2 text-[12px] text-[var(--text3)]">Last sync <Timestamp value={i.lastSyncAt} /></div>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={() => navigate(`/settings/integrations/${i.id}`)}>Configure</Button>
              {i.status === "connected"
                ? <Button variant="ghost" onClick={() => demoSuccess(`${i.name} disconnected`)}>Disconnect</Button>
                : <Button variant="primary" onClick={() => demoSuccess(`${i.name} connected`)}>Connect</Button>}
            </div>
          </div>
        )}
      />
    </FillPage>
  );
}
