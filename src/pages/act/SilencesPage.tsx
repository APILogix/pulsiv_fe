/**
 * Silences: `GET/POST/DELETE /organizations/:orgId/alerting/silences`.
 * A silence is a time window; while it runs, alerts it matches (by rule and
 * label matchers) are marked silenced and routing sends no notification.
 * The list asks for `active: true`, which the API reads as "not expired":
 * running now or scheduled to start later.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useSilenceMutations, useSilences } from "@/modules/alerting/hooks/useAlerting";
import type { AlertSilence } from "@/modules/alerting/api/types";
import { apiErrorMessage, ConfirmDialog, DialogField, FormDialog } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  ProjectPageHeader,
  Readouts,
  RowActions,
  RowTitle,
  SearchField,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  ToolbarCount,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Timestamp, formatAbsoluteTime, formatNumber } from "@/shared/observe";
import { Pill, SegmentedControl, fieldInputClass, fieldTextareaClass, type SegmentOption } from "@/shared/ui/pulse";

// ── module-level constants ───────────────────────────────────

const SILENCES_QUERY = { active: true, limit: 100 };

// Remaining time is measured against this clock, refreshed every 30 seconds.
const CLOCK_TICK_MS = 30_000;

type SilenceState = "active" | "scheduled" | "expired";
type StateFilter = "all" | "active" | "scheduled";

const COLUMNS: SheetColumn[] = [
  { key: "silence", header: "Silence" },
  { key: "state", header: "State", className: "w-[112px]" },
  { key: "starts", header: "Starts", className: `w-[128px] ${HIDE_BELOW_MD}` },
  { key: "ends", header: "Ends", className: `w-[128px] ${HIDE_BELOW_MD}` },
  { key: "remaining", header: "Remaining", className: `w-[120px] ${HIDE_BELOW_LG}` },
  { key: "actions", header: "Actions", srOnly: true, className: "w-[56px]", align: "right" },
];

const MONO = "font-[family-name:var(--mono)] tabular-nums";

// ── helpers ──────────────────────────────────────────────────

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function silenceState(silence: AlertSilence, now: number): SilenceState {
  const ends = Date.parse(silence.endsAt);
  if (!silence.isActive || silence.expiredAt || (!Number.isNaN(ends) && ends <= now)) return "expired";
  const starts = Date.parse(silence.startsAt);
  if (!Number.isNaN(starts) && starts > now) return "scheduled";
  return "active";
}

/**
 * The silence's scope as a matcher expression. No rule and no label matchers
 * means it matches every alert in the organization.
 */
function matcherExpression(silence: AlertSilence): string | null {
  const parts: string[] = [];
  if (silence.ruleId) parts.push(`rule=${silence.ruleId}`);
  const matchers = silence.matchers;
  if (matchers && typeof matchers === "object" && !Array.isArray(matchers)) {
    for (const [key, value] of Object.entries(matchers)) {
      parts.push(`${key}=${typeof value === "string" ? value : JSON.stringify(value)}`);
    }
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

/** Two units at most: 42s, 3m, 5h 40m, 2d 3h. */
function formatSpan(ms: number): string {
  const totalMinutes = Math.floor(Math.max(0, ms) / 60_000);
  if (totalMinutes < 1) return "<1m";
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  if (hours < 48) {
    const rest = totalMinutes % 60;
    return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest > 0 ? `${days}d ${rest}h` : `${days}d`;
}

const STATE_PILL: Record<SilenceState, ReactNode> = {
  // Amber while it runs: it is holding alerts back right now.
  active: (
    <Pill tone="amber" dot>
      Active
    </Pill>
  ),
  scheduled: <Pill>Scheduled</Pill>,
  expired: <Pill>Expired</Pill>,
};

// ── page ─────────────────────────────────────────────────────

export default function SilencesPage() {
  const { data, isLoading, error, refetch } = useSilences(SILENCES_QUERY);
  const { create, remove } = useSilenceMutations();
  const [open, setOpen] = useState(false);
  const [expireTarget, setExpireTarget] = useState<AlertSilence | null>(null);
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [search, setSearch] = useState("");
  const now = useNow();

  const silences = useMemo(() => data?.data ?? [], [data]);
  const rows = useMemo(
    () =>
      silences.map((silence) => ({
        silence,
        state: silenceState(silence, now),
        matcher: matcherExpression(silence),
      })),
    [silences, now],
  );

  const summary = useMemo(() => {
    let active = 0;
    let scheduled = 0;
    let soonestEnd = Number.POSITIVE_INFINITY;
    let nextStart = Number.POSITIVE_INFINITY;
    for (const row of rows) {
      if (row.state === "active") {
        active += 1;
        soonestEnd = Math.min(soonestEnd, Date.parse(row.silence.endsAt));
      } else if (row.state === "scheduled") {
        scheduled += 1;
        nextStart = Math.min(nextStart, Date.parse(row.silence.startsAt));
      }
    }
    return { active, scheduled, soonestEnd, nextStart };
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (stateFilter !== "all" && row.state !== stateFilter) return false;
      if (!needle) return true;
      return `${row.silence.comment ?? ""} ${row.matcher ?? ""}`.toLowerCase().includes(needle);
    });
  }, [rows, stateFilter, search]);

  const total = data?.total ?? silences.length;
  const partial = total > silences.length;
  const loading = isLoading && !data;
  const loadFailed = Boolean(error) && !data;

  const clearFilters = () => {
    setSearch("");
    setStateFilter("all");
  };

  const handleCreate = (form: FormData) => {
    const startsAt = String(form.get("startsAt") ?? "");
    const endsAt = String(form.get("endsAt") ?? "");
    const comment = String(form.get("comment") ?? "");
    create.mutate(
      { startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), comment },
      {
        onSuccess: () => {
          toast.success("Silence created");
          setOpen(false);
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Could not create silence.")),
      },
    );
  };

  const handleExpire = () => {
    if (!expireTarget) return;
    remove.mutate(expireTarget.id, {
      onSuccess: () => {
        toast.success("Silence expired");
        setExpireTarget(null);
      },
      onError: (err) => toast.error(apiErrorMessage(err, "Could not expire silence.")),
    });
  };

  const readouts: Readout[] = [
    {
      label: "Holding alerts",
      value: formatNumber(summary.active),
      tone: summary.active > 0 ? "warn" : "neutral",
      sub:
        summary.active > 0 && Number.isFinite(summary.soonestEnd)
          ? `Next one ends in ${formatSpan(summary.soonestEnd - now)}`
          : "Nothing is silenced now",
    },
    {
      label: "Scheduled",
      value: formatNumber(summary.scheduled),
      sub:
        summary.scheduled > 0 && Number.isFinite(summary.nextStart)
          ? `Next one starts in ${formatSpan(summary.nextStart - now)}`
          : "None waiting to start",
    },
    {
      label: "Not expired",
      value: formatNumber(total),
      sub: partial ? `Readings use the latest ${formatNumber(silences.length)}` : "Active or scheduled",
    },
  ];

  const stateOptions: SegmentOption<StateFilter>[] = [
    { value: "all", label: "All", count: rows.length },
    { value: "active", label: "Active", count: summary.active },
    { value: "scheduled", label: "Scheduled", count: summary.scheduled },
  ];

  let body: ReactNode;
  if (loading) {
    body = <SheetLoading rows={4} label="Loading silences" />;
  } else if (loadFailed) {
    body = (
      <SheetError
        title="Could not load silences"
        message={apiErrorMessage(error, "The silence list is unavailable right now.")}
        onRetry={() => void refetch()}
      />
    );
  } else if (rows.length === 0) {
    body = (
      <SheetEmpty
        title="No active or scheduled silences"
        description="A silence is a time-boxed window. While it runs, alerts it matches are marked silenced and routing sends no notification for them. It ends at the time you set, or earlier if you expire it. Add one before planned maintenance so nobody is paged for expected noise."
        action={
          <UiButton variant="outline" size="lg" onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            New silence
          </UiButton>
        }
      />
    );
  } else if (filtered.length === 0) {
    body = (
      <SheetEmpty
        title="No silences match"
        description={
          search.trim()
            ? `Nothing matches “${search.trim()}” with the current state filter.`
            : "No silence matches the current state filter."
        }
        action={
          <UiButton variant="outline" size="lg" onClick={clearFilters}>
            Clear filters
          </UiButton>
        }
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Active and scheduled silences" minWidth={440}>
        {filtered.map(({ silence, state, matcher }) => {
          const title = silence.comment?.trim() || "No reason given";
          const endsMs = Date.parse(silence.endsAt);
          const startsMs = Date.parse(silence.startsAt);
          return (
            <SheetRow key={silence.id} muted={state === "expired"}>
              <SheetCell>
                <RowTitle
                  title={title}
                  subtitle={matcher ?? "Matches every alert"}
                  subtitleMono={matcher !== null}
                />
              </SheetCell>
              <SheetCell>{STATE_PILL[state]}</SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                <Timestamp value={silence.startsAt} />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                <Timestamp value={silence.endsAt} />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                {state === "active" && !Number.isNaN(endsMs) ? (
                  <span className={`${MONO} text-[12px] text-[var(--text2)]`} title={`Ends ${formatAbsoluteTime(silence.endsAt)}`}>
                    {formatSpan(endsMs - now)} left
                  </span>
                ) : state === "scheduled" && !Number.isNaN(startsMs) ? (
                  <span className={`${MONO} text-[12px] text-[var(--text2)]`} title={`Starts ${formatAbsoluteTime(silence.startsAt)}`}>
                    in {formatSpan(startsMs - now)}
                  </span>
                ) : (
                  <span className="text-[12px] text-[var(--text3)]">Ended</span>
                )}
              </SheetCell>
              <SheetCell align="right">
                <RowActions label={`Actions for silence: ${title}`}>
                  {state === "expired" ? (
                    <DropdownMenuItem disabled>Already expired</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem variant="destructive" onSelect={() => setExpireTarget(silence)}>
                      {state === "scheduled" ? "Expire before it starts" : "Expire now"}
                    </DropdownMenuItem>
                  )}
                </RowActions>
              </SheetCell>
            </SheetRow>
          );
        })}
      </SheetTable>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Silences"
        description="Time-boxed windows that hold back notifications for matching alerts. Expired silences are not listed."
        actions={
          <UiButton size="lg" onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            New silence
          </UiButton>
        }
      />

      {!loadFailed && <Readouts cells={readouts} loading={loading} label="Silence summary" />}

      <Sheet
        label="Silence list"
        toolbar={
          <>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search by reason or matcher"
              label="Search silences"
            />
            <div className="sidebar-scroll max-w-full overflow-x-auto">
              <SegmentedControl
                value={stateFilter}
                onChange={setStateFilter}
                options={stateOptions}
                ariaLabel="Filter silences by state"
              />
            </div>
            {!loading && !loadFailed && (
              <ToolbarCount>
                {formatNumber(filtered.length)} {filtered.length === 1 ? "silence" : "silences"}
              </ToolbarCount>
            )}
          </>
        }
        footer={
          partial && !loadFailed ? (
            <span>
              Showing the latest <span className={MONO}>{formatNumber(silences.length)}</span> of{" "}
              <span className={MONO}>{formatNumber(total)}</span> silences. Search and filters apply to these.
            </span>
          ) : undefined
        }
      >
        {body}
      </Sheet>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="New silence"
        description="This silence has no rule or label matcher, so it holds back notifications for every alert in the organization while the window is open."
        submitLabel="Create silence"
        pending={create.isPending}
        onSubmit={handleCreate}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DialogField label="Starts" name="startsAt" required>
            <input id="startsAt" name="startsAt" type="datetime-local" required className={fieldInputClass} />
          </DialogField>
          <DialogField label="Ends" name="endsAt" required>
            <input id="endsAt" name="endsAt" type="datetime-local" required className={fieldInputClass} />
          </DialogField>
        </div>
        <DialogField label="Reason" name="comment" hint="Shown in the list so others know why alerts are quiet.">
          <textarea id="comment" name="comment" className={fieldTextareaClass} placeholder="Database maintenance window" />
        </DialogField>
      </FormDialog>

      <ConfirmDialog
        open={!!expireTarget}
        onOpenChange={(next) => !next && setExpireTarget(null)}
        title="Expire this silence?"
        description={
          expireTarget
            ? `“${expireTarget.comment?.trim() || "No reason given"}” ends now. Matching alerts will notify again. This cannot be undone; create a new silence to quiet them again.`
            : undefined
        }
        confirmLabel="Expire silence"
        pending={remove.isPending}
        onConfirm={handleExpire}
      />
    </WorkspacePage>
  );
}
