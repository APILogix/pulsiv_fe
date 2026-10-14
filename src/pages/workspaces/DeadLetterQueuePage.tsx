import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { useDeadLetterMutations, useDeadLetterQueue, type DeadLetter } from "@/modules/projects/hooks/useDeadLetters";
import { projectPath } from "@/modules/projects/navigation/project-routes";
import { ConfirmDialog, apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  ProjectPageHeader,
  Readouts,
  RowActions,
  RowTitle,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  TextLink,
  ToolbarCount,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Timestamp, formatAbsoluteTime, formatNumber, formatRelativeTime } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useCurrentProject } from "./ProjectShellPage";

// ── module-level constants (rules.md §1.2) ───────────────────

const COLUMNS: SheetColumn[] = [
  { key: "failed", header: "Failed", className: "w-[112px]" },
  { key: "destination", header: "Destination", className: `w-[220px] ${HIDE_BELOW_MD}` },
  { key: "reason", header: "Reason", className: "w-full" },
  { key: "payload", header: "Payload", align: "right", className: `w-[96px] ${HIDE_BELOW_LG}` },
  { key: "actions", header: "Actions", srOnly: true, align: "right", className: "w-px" },
];

function sentenceCase(value: string) {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ── page ─────────────────────────────────────────────────────

export default function DeadLetterQueuePage() {
  // The project comes from the shell. Project URLs carry the public ID, not
  // the internal UUID the API expects.
  const { projectId, orgSlug, publicId } = useCurrentProject();
  const { data, isLoading, error, refetch } = useDeadLetterQueue(projectId);
  const mutations = useDeadLetterMutations(projectId);
  const letters: DeadLetter[] = data ?? [];

  const [confirmPurge, setConfirmPurge] = useState(false);

  const destinations = new Set(letters.map((letter) => letter.routeName)).size;
  const oldest = letters.reduce<number | null>(
    (current, letter) => (current === null || letter.timestamp < current ? letter.timestamp : current),
    null,
  );

  const readouts: Readout[] = [
    {
      label: "Dead letters",
      value: formatNumber(letters.length),
      sub: letters.length > 0 ? "Waiting for replay or discard" : "Nothing waiting",
      tone: letters.length > 0 ? "bad" : "neutral",
    },
    { label: "Destinations", value: formatNumber(destinations), sub: "With failed notifications" },
    {
      label: "Oldest failure",
      value: oldest === null ? "—" : formatRelativeTime(oldest),
      title: oldest === null ? undefined : formatAbsoluteTime(oldest),
      sub: oldest === null ? "Queue is empty" : "Still in the queue",
    },
  ];

  const replayOne = (letter: DeadLetter) =>
    mutations.reprocessDeadLetter.mutate(letter.id, {
      onSuccess: () => toast.success(`Replaying the notification to ${letter.routeName}`),
    });

  const discardOne = (letter: DeadLetter) =>
    mutations.discardDeadLetter.mutate(letter.id, {
      onSuccess: () => toast.success("Dead letter discarded"),
    });

  const replayAll = () =>
    mutations.reprocessAll.mutate(undefined, {
      onSuccess: () => toast.success("Replaying every dead letter"),
    });

  const empty = !isLoading && !error && letters.length === 0;
  const busy = mutations.reprocessAll.isPending || mutations.purgeQueue.isPending;

  let body: ReactNode;
  if (isLoading) {
    body = <SheetLoading rows={4} label="Loading dead letters" />;
  } else if (error) {
    body = (
      <SheetError title="Could not load dead letters" message={apiErrorMessage(error)} onRetry={() => void refetch()} />
    );
  } else if (letters.length === 0) {
    body = (
      <SheetEmpty
        title="The queue is empty"
        description="Notifications land here only after every retry fails, so an empty queue is the healthy state."
        action={
          <TextLink to={projectPath(orgSlug, publicId, "deliveries")} arrow>
            Open the delivery log
          </TextLink>
        }
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Dead letters" minWidth={480}>
        {letters.map((letter) => {
          const replaying =
            mutations.reprocessDeadLetter.isPending && mutations.reprocessDeadLetter.variables === letter.id;
          const discarding =
            mutations.discardDeadLetter.isPending && mutations.discardDeadLetter.variables === letter.id;
          return (
            <SheetRow key={letter.id} muted={discarding}>
              <SheetCell>
                <Timestamp value={letter.timestamp} />
              </SheetCell>
              <SheetCell className={`max-w-0 ${HIDE_BELOW_MD}`}>
                <RowTitle title={letter.routeName} subtitle={sentenceCase(letter.target)} />
              </SheetCell>
              <SheetCell className="w-full max-w-0">
                {/* Below md the destination column is hidden, so it leads the reason. */}
                <span className="block truncate text-[13px] font-medium text-[var(--text)] md:hidden">{letter.routeName}</span>
                <span className="block truncate text-[13px] text-[var(--text2)]" title={letter.reason}>
                  {letter.reason}
                </span>
              </SheetCell>
              <SheetCell align="right" className={HIDE_BELOW_LG}>
                <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">{letter.payloadSize}</span>
              </SheetCell>
              <SheetCell align="right">
                <div className="flex items-center justify-end gap-1.5">
                  <UiButton
                    variant="outline"
                    size="sm"
                    disabled={replaying || discarding || busy}
                    onClick={() => replayOne(letter)}
                    aria-label={`Replay the notification to ${letter.routeName}`}
                  >
                    {replaying ? "Replaying…" : "Replay"}
                  </UiButton>
                  <RowActions label={`Actions for the notification to ${letter.routeName}`} disabled={discarding || busy}>
                    <DropdownMenuItem variant="destructive" onSelect={() => discardOne(letter)}>
                      Discard notification
                    </DropdownMenuItem>
                  </RowActions>
                </div>
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
        title="Dead letters"
        description="Notifications that failed after every retry. Replay them once the destination is fixed, or discard them."
        actions={
          <>
            <UiButton variant="outline" size="lg" asChild>
              <Link to={projectPath(orgSlug, publicId, "deliveries")}>Delivery log</Link>
            </UiButton>
            <UiButton variant="destructive" size="lg" disabled={empty || isLoading || busy} onClick={() => setConfirmPurge(true)}>
              Discard all
            </UiButton>
            <UiButton size="lg" disabled={empty || isLoading || busy} onClick={replayAll}>
              {mutations.reprocessAll.isPending ? "Replaying…" : "Replay all"}
            </UiButton>
          </>
        }
      />

      <Readouts cells={readouts} loading={isLoading} label="Dead letter summary" />

      <Sheet
        label="Dead letters"
        toolbar={
          !isLoading && !error && letters.length > 0 ? (
            <>
              <span className="text-[12px] text-[var(--text3)]">Replaying resets the attempt count and sends the notification again.</span>
              <ToolbarCount>
                {formatNumber(letters.length)} {letters.length === 1 ? "dead letter" : "dead letters"}
              </ToolbarCount>
            </>
          ) : undefined
        }
      >
        {body}
      </Sheet>

      <ConfirmDialog
        open={confirmPurge}
        onOpenChange={setConfirmPurge}
        title="Discard every dead letter?"
        description={`${formatNumber(letters.length)} failed ${letters.length === 1 ? "notification is" : "notifications are"} removed from the queue and won't be delivered. This can't be undone.`}
        confirmLabel="Discard all"
        pending={mutations.purgeQueue.isPending}
        onConfirm={() =>
          mutations.purgeQueue.mutate(undefined, {
            onSuccess: () => {
              setConfirmPurge(false);
              toast.success("Every dead letter was discarded");
            },
          })
        }
      />
    </WorkspacePage>
  );
}
