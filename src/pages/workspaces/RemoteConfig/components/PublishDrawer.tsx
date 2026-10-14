import { useId, useState } from 'react';
import { AlertTriangle, ArrowRight, Loader2, ShieldAlert } from 'lucide-react';

import {
  Sheet as Drawer,
  SheetContent as DrawerContent,
  SheetDescription as DrawerDescription,
  SheetHeader as DrawerHeader,
  SheetTitle as DrawerTitle,
} from '@/components/ui/sheet';
import { Button as UiButton } from '@/components/ui/button';
import { DialogField, dialogTextareaClass } from '@/modules/projects/components/project-ui';
import { Notice } from '@/shared/ui/pulse';
import { cn } from '@/lib/utils';

import { formatDiffValue, SECTION_LABELS, type DiffEntry } from '../mapping';
import type { FieldError } from '../bounds';

interface PublishDrawerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (changeSummary: string) => void;
  diff: DiffEntry[];
  errors: FieldError[];
  isSaving: boolean;
  environmentName: string;
  currentRevision: number;
}

export function PublishDrawer({
  open,
  onClose,
  onConfirm,
  diff,
  errors,
  isSaving,
  environmentName,
  currentRevision,
}: PublishDrawerProps) {
  const [summary, setSummary] = useState('');
  const summaryId = useId();
  const changesId = useId();
  const hasErrors = errors.length > 0;
  const grouped = Object.entries(groupBySection(diff));
  const nextRevision = currentRevision + 1;
  const canPublish = !hasErrors && diff.length > 0 && !isSaving;

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DrawerContent className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[560px]">
        <DrawerHeader className="gap-1.5 border-b border-[var(--border)] px-5 py-4 pr-12">
          <DrawerTitle className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--text)]">Review and publish</DrawerTitle>
          <DrawerDescription className="text-[12px] text-[var(--text2)]">
            {environmentName} · publishes as revision{' '}
            <span className="font-[family-name:var(--mono)] tabular-nums text-[var(--text)]">{nextRevision}</span>
          </DrawerDescription>
        </DrawerHeader>

        <div className="sidebar-scroll flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
          {hasErrors ? (
            <Notice
              tone="red"
              icon={ShieldAlert}
              title={`${errors.length} validation ${errors.length === 1 ? 'error blocks' : 'errors block'} publishing`}
            >
              Fix the highlighted fields in the editor. The server rejects values outside their bounds or that fail
              cross-field rules.
            </Notice>
          ) : diff.length === 0 ? (
            <p className="text-[13px] leading-[1.6] text-[var(--text2)]">
              No changes to publish. Edit a section, then review it here.
            </p>
          ) : (
            <Notice tone="amber" icon={AlertTriangle}>
              Publishing deploys to every connected SDK in{' '}
              <strong className="font-medium text-[var(--text)]">{environmentName}</strong>. Clients pick it up on their
              next configuration refresh.
            </Notice>
          )}

          {diff.length > 0 && (
            <section aria-labelledby={changesId} className="flex flex-col gap-4">
              <h3 id={changesId} className="flex items-baseline gap-2 text-[13px] font-medium text-[var(--text)]">
                Changes
                <span className="font-[family-name:var(--mono)] text-[11.5px] tabular-nums text-[var(--text3)]">{diff.length}</span>
              </h3>

              {grouped.map(([section, entries]) => (
                <div key={section} className="flex flex-col gap-1.5">
                  <h4 className="text-[12px] text-[var(--text3)]">
                    {SECTION_LABELS[section] ?? section} · {entries.length}
                  </h4>
                  <dl className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]">
                    {entries.map((entry) => (
                      <div
                        key={entry.path}
                        className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                      >
                        <dt className="min-w-0 truncate text-[13px] text-[var(--text2)]" title={entry.path}>
                          {entry.label}
                        </dt>
                        <dd className="flex min-w-0 shrink-0 items-center gap-2 font-[family-name:var(--mono)] text-[12px] tabular-nums">
                          <span className="text-[var(--text3)] line-through decoration-[var(--text3)]">
                            <span className="sr-only">From </span>
                            {formatDiffValue(entry.path, entry.oldValue)}
                          </span>
                          <ArrowRight className="size-3 shrink-0 text-[var(--text3)]" aria-hidden="true" />
                          <span className="text-[var(--text)]">
                            <span className="sr-only">to </span>
                            {formatDiffValue(entry.path, entry.newValue)}
                          </span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </section>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-[var(--border)] px-5 py-4">
          <DialogField label="Change summary" name={summaryId} hint="Saved with the revision in its history.">
            <textarea
              id={summaryId}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Lowered trace sampling for checkout endpoints"
              rows={2}
              maxLength={2000}
              className={cn(dialogTextareaClass, 'min-h-[64px] resize-none')}
            />
          </DialogField>
          <div className="flex items-center justify-end gap-2">
            <UiButton variant="ghost" size="lg" onClick={onClose} disabled={isSaving}>
              Cancel
            </UiButton>
            <UiButton size="lg" onClick={() => onConfirm(summary.trim())} disabled={!canPublish}>
              {isSaving && <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />}
              {isSaving ? 'Publishing…' : `Publish revision ${nextRevision}`}
            </UiButton>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function groupBySection(diff: DiffEntry[]): Record<string, DiffEntry[]> {
  const grouped: Record<string, DiffEntry[]> = {};
  for (const entry of diff) {
    (grouped[entry.section] ??= []).push(entry);
  }
  return grouped;
}
