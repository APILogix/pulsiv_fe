import { useActionState, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { CircleCheck, Slack, TriangleAlert } from "lucide-react";
import { useConnector, useSlackChannels, useConnectorMutations } from "@/modules/organizations/hooks/useConnectors";
import {
  AuthButton,
  AuthCard,
  AuthField,
  AuthResult,
  AuthSubmit,
  Notice,
  fieldInputClass,
} from "@/shared/ui/pulse";
import { Skeleton } from "@/components/ui/skeleton";

// ── module-level constants (rules.md §1.2) ──

// The OAuth return pages render inside the app shell, so the centred shell is
// sized against the viewport minus the app header and module padding.
const RESULT_SHELL =
  "relative flex min-h-[calc(100dvh-var(--header-height)-3rem)] items-center justify-center overflow-hidden rounded-[16px] bg-[var(--bg)] px-4 py-10";

interface ChannelState {
  error: string | null;
}

const INITIAL_CHANNEL_STATE: ChannelState = { error: null };

// ── one-off local components ─────────────────────────────────

function ResultShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={RESULT_SHELL}>
      <div className="pulse-grid pulse-aurora pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="pulse-rise relative z-10 w-full max-w-[460px]">{children}</div>
    </div>
  );
}

export default function SlackSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const connectorId = searchParams.get("connectorId");

  const { data: connector, isLoading: loadingConnector } = useConnector(connectorId || "");
  const { data: channelsData, isLoading: loadingChannels } = useSlackChannels(connectorId || "");
  const { updateConnector } = useConnectorMutations();

  const [selectedChannel, setSelectedChannel] = useState("");

  const [saveState, saveAction] = useActionState(async (_prev: ChannelState, form: FormData) => {
    const channel = String(form.get("channel") || "");
    if (!connectorId || !channel) return { error: "Select a channel to continue." };
    try {
      await updateConnector.mutateAsync({
        id: connectorId,
        payload: {
          config: {
            defaultChannel: channel,
          },
        },
      });
      navigate(`/connectors/integrations/${connectorId}`);
      return INITIAL_CHANNEL_STATE;
    } catch (err: any) {
      return { error: err?.response?.data?.message || err?.message || "Could not save the default channel." };
    }
  }, INITIAL_CHANNEL_STATE);

  if (!connectorId) {
    return (
      <ResultShell>
        <AuthCard>
          <AuthResult
            icon={TriangleAlert}
            tone="amber"
            title="Slack connected, setup incomplete"
            description="The workspace was authorized but Pulsiv did not receive a connector reference, so the default channel could not be set."
            actions={
              <AuthButton type="button" variant="ghost" onClick={() => navigate("/connectors/integrations")}>
                Back to integrations
              </AuthButton>
            }
          />
        </AuthCard>
      </ResultShell>
    );
  }

  const channels = channelsData?.channels || [];
  const teamName = connector?.metadata?.teamName || "your workspace";
  const loading = loadingConnector || loadingChannels;

  return (
    <ResultShell>
      <AuthCard>
        <AuthResult
          icon={CircleCheck}
          tone="green"
          title="Slack connected"
          description={
            <>
              Pulsiv is authorized for <strong className="font-semibold text-[var(--text)]">{teamName}</strong>. Pick the
              channel that should receive alert notifications.
            </>
          }
        >
          {loading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full rounded-[9px]" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ) : (
            <form action={saveAction} className="flex flex-col gap-5 text-left">
              {saveState.error && (
                <Notice tone="red" icon={TriangleAlert}>
                  {saveState.error}
                </Notice>
              )}

              <AuthField
                label="Default channel"
                htmlFor="channel"
                hint="For a private channel, invite the Pulsiv bot to it in Slack first."
              >
                <select
                  id="channel"
                  name="channel"
                  required
                  className={fieldInputClass}
                  value={selectedChannel}
                  onChange={(event) => setSelectedChannel(event.target.value)}
                >
                  <option value="" disabled>
                    Select a channel…
                  </option>
                  {channels.map((channel: any) => (
                    <option key={channel.id} value={channel.id}>
                      #{channel.name}
                      {channel.isPrivate ? " (private)" : ""}
                    </option>
                  ))}
                </select>
              </AuthField>

              <div className="flex flex-col gap-2.5">
                <AuthSubmit pendingLabel="Saving…">Save and continue</AuthSubmit>
                <AuthButton
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/connectors/integrations")}
                >
                  Skip for now
                </AuthButton>
              </div>
            </form>
          )}
        </AuthResult>
      </AuthCard>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-[var(--text3)]">
        <Slack className="size-3.5" aria-hidden="true" />
        Slack workspace connector
      </p>
    </ResultShell>
  );
}
