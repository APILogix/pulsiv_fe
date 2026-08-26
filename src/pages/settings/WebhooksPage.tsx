import { useActionState, useState } from "react";
import { useNavigate } from "react-router";
import { Activity, CircleCheck, Plus, TriangleAlert, Webhook } from "lucide-react";
import { useWebhooks } from "@/hooks/useDummyData";
import {
  EmptyPanel,
  PageHero,
  Panel,
  Toolbar,
  fieldInputClass,
} from "@/shared/ui/pulse";
import { StatCard } from "@/shared/ui/pulse";
import {
  Button,
  Field,
  FilterSelect,
  MonospaceText,
  SearchInput,
  StatusBadge,
  StatusCodeBadge,
  SubmitButton,
  Table,
  Td,
  Timestamp,
  Tr,
  demoSuccess,
  formatNumber,
} from "@/shared/observe";
import { Skeleton } from "@/components/ui/skeleton";
import type { Webhook as WebhookType } from "@/lib/dummy-data";

// ── module-level constants (rules.md §1.2) ──

const TABLE_HEADERS = ["Endpoint", "URL", "Events", "Success rate", "Last delivery", "Status"];

const SKELETON_ROWS = ["r1", "r2", "r3", "r4", "r5"];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "failed", label: "Failed" },
];

interface CreateState {
  ok: boolean;
}

const INITIAL_CREATE_STATE: CreateState = { ok: false };

// ── one-off local components ─────────────────────────────────

function RateMeter({ value }: { value: number }) {
  const tone = value >= 99 ? "var(--green)" : value >= 90 ? "var(--amber)" : "var(--red)";
  return (
    <span className="flex items-center gap-2">
      <span
        className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-[var(--bg3)]"
        role="progressbar"
        aria-label="Delivery success rate"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: tone }} />
      </span>
      <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
        {value.toFixed(1)}%
      </span>
    </span>
  );
}

function successRateOf(webhook: WebhookType) {
  const attempts = webhook.deliveryHistory;
  if (attempts.length === 0) return 100;
  const ok = attempts.filter((attempt) => attempt.statusCode < 400).length;
  return (ok / attempts.length) * 100;
}

export default function WebhooksPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useWebhooks();
  const webhooks = data ?? [];

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const [, createAction] = useActionState(async (_p: CreateState, form: FormData) => {
    await new Promise((r) => setTimeout(r, 600));
    demoSuccess(`Webhook created: ${form.get("url")}`);
    return { ok: true };
  }, INITIAL_CREATE_STATE);

  const needle = query.trim().toLowerCase();
  const rows = webhooks.filter((webhook) => {
    const matchesStatus = status === "all" || webhook.status === status;
    const matchesQuery =
      needle.length === 0 ||
      webhook.name.toLowerCase().includes(needle) ||
      webhook.url.toLowerCase().includes(needle);
    return matchesStatus && matchesQuery;
  });

  const attempts = webhooks.flatMap((webhook) => webhook.deliveryHistory);
  const failures = attempts.filter((attempt) => attempt.statusCode >= 400).length;
  const successRate = attempts.length === 0 ? 100 : ((attempts.length - failures) / attempts.length) * 100;

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Developer"
        title="Webhooks"
        description="Outbound event delivery to your own endpoints, with signed payloads and per-attempt delivery history."
        icon={Webhook}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Endpoints" value={formatNumber(webhooks.length)} icon={Webhook} tone="brand" />
        <StatCard label="Delivery attempts" value={formatNumber(attempts.length)} icon={Activity} tone="blue" />
        <StatCard
          label="Success rate"
          value={successRate.toFixed(1)}
          unit="%"
          icon={CircleCheck}
          tone={successRate >= 99 ? "green" : successRate >= 90 ? "amber" : "red"}
        />
        <StatCard
          label="Failed attempts"
          value={formatNumber(failures)}
          icon={TriangleAlert}
          tone={failures > 0 ? "red" : "neutral"}
        />
      </div>

      <Panel title="Create endpoint" description="Sentinel signs every payload with a per-endpoint secret." icon={Plus}>
        <form action={createAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[280px] flex-1">
            <Field label="Endpoint URL">
              <input name="url" type="url" required placeholder="https://example.com/hooks" className={fieldInputClass} />
            </Field>
          </div>
          <SubmitButton>
            <Plus className="size-4" aria-hidden="true" />
            Create endpoint
          </SubmitButton>
        </form>
      </Panel>

      <Toolbar
        trailing={
          <span className="font-[family-name:var(--mono)] text-[11.5px] tabular-nums text-[var(--text3)]">
            {rows.length} / {webhooks.length}
          </span>
        }
      >
        <SearchInput placeholder="Search by name or URL…" defaultValue={query} onSearch={setQuery} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      </Toolbar>

      {isLoading ? (
        <Panel bodyClassName="p-0">
          <div className="divide-y divide-[var(--border)]">
            {SKELETON_ROWS.map((row) => (
              <div key={row} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="ml-auto h-4 w-24" />
              </div>
            ))}
          </div>
        </Panel>
      ) : rows.length === 0 ? (
        <EmptyPanel
          icon={Webhook}
          title={webhooks.length === 0 ? "No webhook endpoints" : "No endpoints match these filters"}
          description={
            webhooks.length === 0
              ? "Create an endpoint to start receiving signed incident and alert events."
              : "Clear the search or pick a different status to see more endpoints."
          }
          action={
            webhooks.length === 0 ? undefined : (
              <Button
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <Table headers={TABLE_HEADERS} maxHeight="34rem">
          {rows.map((webhook) => (
            <Tr key={webhook.id} onClick={() => navigate(`/connectors/webhooks/${webhook.id}`)}>
              <Td className="font-medium">{webhook.name}</Td>
              <Td>
                <MonospaceText value={webhook.url} />
              </Td>
              <Td className="font-[family-name:var(--mono)] tabular-nums text-[12px] text-[var(--text2)]">
                {webhook.events.length}
              </Td>
              <Td>
                <RateMeter value={successRateOf(webhook)} />
              </Td>
              <Td>
                <span className="flex items-center gap-2">
                  <StatusCodeBadge code={webhook.lastDelivery.statusCode} />
                  <Timestamp value={webhook.lastDelivery.timestamp} />
                </span>
              </Td>
              <Td>
                <StatusBadge status={webhook.status} />
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </div>
  );
}
