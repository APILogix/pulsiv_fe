import { useState } from 'react';
import { AlertTriangle, ArrowRight, Rocket, ShieldAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/observe';
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

/**
 * Review-before-publish drawer. Replaces the old instant "Save Changes"
 * sticky bar — publishing now requires an explicit review step that shows
 * exactly which fields changed (leaf-level, human-readable, never a raw
 * JSON dump) plus an optional change summary, since this config ships live
 * to every connected SDK the moment it's confirmed.
 */
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
  const hasErrors = errors.length > 0;
  const grouped = groupBySection(diff);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex h-full w-full max-w-[560px] flex-col border-l border-[var(--border)] bg-[var(--bg1)] shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-[10px] bg-[var(--brand)]/15 text-[var(--brand)]">
              <Rocket className="size-4.5" />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--text)]">Review & publish</h2>
              <p className="text-[12px] text-[var(--text3)]">
                {environmentName} · will become revision {currentRevision + 1}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close publish review"
            className="text-[var(--text3)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="sidebar-scroll flex-1 overflow-y-auto px-6 py-5">
          {hasErrors ? (
            <div className="mb-5 flex items-start gap-3 rounded-[10px] border border-red-500/30 bg-red-500/10 p-4">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-red-500" />
              <div>
                <p className="text-[13px] font-medium text-red-500">
                  {errors.length} field{errors.length === 1 ? '' : 's'} out of range
                </p>
                <p className="mt-1 text-[12px] text-red-400">
                  Fix the highlighted fields in the editor before this can be published. The backend will reject an
                  out-of-bounds value regardless.
                </p>
              </div>
            </div>
          ) : diff.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-[var(--border)] bg-[var(--bg2)] p-6 text-center text-[13px] text-[var(--text3)]">
              No changes to publish.
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-[10px] border border-amber-500/30 bg-amber-500/10 p-4">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <p className="text-[12.5px] leading-relaxed text-amber-100">
                This publishes immediately to every connected SDK for <strong>{environmentName}</strong>. Clients pick
                up the change on their next config TTL refresh — there is no staged rollout for this environment scope.
              </p>
            </div>
          )}

          {diff.length > 0 && (
            <div className="mt-5 flex flex-col gap-4">
              {Object.entries(grouped).map(([section, entries]) => (
                <div key={section} className="rounded-[10px] border border-[var(--border)] bg-[var(--bg2)]">
                  <div className="border-b border-[var(--border)] px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-[var(--text3)]">
                    {SECTION_LABELS[section] ?? section} · {entries.length}
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {entries.map((entry) => (
                      <div key={entry.path} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                        <span className="min-w-0 truncate text-[var(--text2)]">{entry.label}</span>
                        <div className="flex shrink-0 items-center gap-2 font-mono text-[12px]">
                          <span className="rounded-md bg-[var(--bg3)] px-2 py-0.5 text-[var(--text3)] line-through">
                            {formatDiffValue(entry.path, entry.oldValue)}
                          </span>
                          <ArrowRight className="size-3 text-[var(--text3)]" />
                          <span className="rounded-md bg-[var(--brand)]/15 px-2 py-0.5 font-semibold text-[var(--brand)]">
                            {formatDiffValue(entry.path, entry.newValue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border)] px-6 py-5">
          <label className="mb-2 block text-[12px] font-medium text-[var(--text3)]">
            Change summary <span className="text-[var(--text3)]/70">(recommended)</span>
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={`e.g. "Lowered trace sampling to 20% to cut ingestion cost"`}
            rows={2}
            maxLength={2000}
            className="w-full resize-none rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-[13px] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text3)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
          />
          <div className="mt-4 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={() => onConfirm(summary.trim())}
              disabled={hasErrors || diff.length === 0 || isSaving}
              className={cn('bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600')}
            >
              <Rocket className="mr-2 size-4" />
              {isSaving ? 'Publishing…' : `Publish revision ${currentRevision + 1}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function groupBySection(diff: DiffEntry[]): Record<string, DiffEntry[]> {
  const grouped: Record<string, DiffEntry[]> = {};
  for (const entry of diff) {
    (grouped[entry.section] ??= []).push(entry);
  }
  return grouped;
}
