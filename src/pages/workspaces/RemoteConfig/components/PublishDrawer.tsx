import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-[var(--overlay)] animate-in fade-in duration-150">
      <div className="flex h-full w-full max-w-[560px] flex-col border-l border-[var(--border)] bg-[var(--bg1)] shadow-[var(--shadow-modal)] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-[var(--radius)] bg-[var(--brand)] text-[var(--brand-fg)] shadow-xs">
              <Rocket className="size-4.5" />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--text)] font-[family-name:var(--display)]">
                Review & Publish Configuration
              </h2>
              <p className="text-[12px] text-[var(--text3)]">
                Scope: <strong className="text-[var(--text)]">{environmentName}</strong> · will deploy as Revision #{currentRevision + 1}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close publish review"
            className="rounded p-1 text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)] transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable Diff Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {hasErrors ? (
            <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--red)]/40 bg-[var(--red-bg)] p-4">
              <ShieldAlert className="mt-0.5 size-4.5 shrink-0 text-[var(--red)]" />
              <div>
                <p className="text-[13px] font-bold text-[var(--red)]">
                  {errors.length} validation {errors.length === 1 ? 'error' : 'errors'} blocking publication
                </p>
                <p className="mt-1 text-[12px] text-[var(--text2)] leading-relaxed">
                  Review the highlighted invalid fields in the editor. Values exceeding bounds or failing cross-field validation rules will be rejected by the server compiler.
                </p>
              </div>
            </div>
          ) : diff.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--bg2)]/60 p-8 text-center text-[13px] text-[var(--text3)]">
              No changes detected in the local buffer.
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--amber)]/40 bg-[var(--amber-bg)] p-4">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--amber)]" />
              <p className="text-[12px] leading-relaxed text-[var(--text2)]">
                This revision will immediately deploy to connected SDK instances running in <strong>{environmentName}</strong>. Connected clients pick up updates automatically upon their next config TTL refresh.
              </p>
            </div>
          )}

          {diff.length > 0 && (
            <div className="flex flex-col gap-3.5 pt-2">
              <span className="eyebrow text-[var(--text3)]">Summary of Modified Properties ({diff.length})</span>
              {Object.entries(grouped).map(([section, entries]) => (
                <div key={section} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/50 overflow-hidden">
                  <div className="border-b border-[var(--border)] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--text3)] bg-[var(--bg2)]">
                    {SECTION_LABELS[section] ?? section} ({entries.length})
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {entries.map((entry) => (
                      <div key={entry.path} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[12.5px]">
                        <span className="min-w-0 truncate font-medium text-[var(--text2)]">{entry.label}</span>
                        <div className="flex shrink-0 items-center gap-2 font-mono text-[11.5px]">
                          <span className="rounded bg-[var(--bg3)] px-2 py-0.5 text-[var(--text3)] line-through">
                            {formatDiffValue(entry.path, entry.oldValue)}
                          </span>
                          <ArrowRight className="size-3 text-[var(--text3)]" />
                          <span className="rounded bg-[var(--brand)]/15 px-2 py-0.5 font-bold text-[var(--brand)]">
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

        {/* Footer with Change Summary & Actions */}
        <div className="border-t border-[var(--border)] bg-[var(--bg1)] px-6 py-5">
          <label className="mb-2 block text-[12px] font-medium text-[var(--text2)]">
            Change Summary <span className="text-[var(--text3)] font-normal">(stored in immutable revision log)</span>
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={`e.g. "Adjusted sampling rates for high-traffic payment endpoints"`}
            rows={2}
            maxLength={2000}
            className="w-full resize-none rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-[12.5px] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text3)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
          />
          <div className="mt-4 flex items-center justify-end gap-2.5">
            <Button variant="ghost" onClick={onClose} disabled={isSaving} className="h-8.5 px-3.5 text-xs text-[var(--text2)] hover:text-[var(--text)]">
              Cancel
            </Button>
            <Button
              onClick={() => onConfirm(summary.trim())}
              disabled={hasErrors || diff.length === 0 || isSaving}
              className={cn(
                'h-8.5 gap-1.5 px-4 text-xs font-semibold shadow-xs',
                hasErrors || diff.length === 0
                  ? 'bg-[var(--bg2)] text-[var(--text3)] cursor-not-allowed border border-[var(--border)]'
                  : 'bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-d)]'
              )}
            >
              <Rocket className="size-3.5" />
              {isSaving ? 'Deploying Revision…' : `Publish Revision #${currentRevision + 1}`}
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
