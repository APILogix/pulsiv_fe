import { Check, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button as UiButton } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type OrgCreationPhase = 'creating' | 'ready' | 'failed';

interface OrgCreationDialogProps {
  open: boolean;
  phase: OrgCreationPhase;
  orgName: string;
  slug: string;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}

/**
 * What POST /organizations sets up. All three happen in one database
 * transaction (pulse core.service createOrganization), so they are shown as one
 * outcome, never as timed stages.
 */
function creationItems(slug: string) {
  return [
    { id: 'org', label: slug ? `The organization at /${slug}, with you as owner` : 'The organization, with you as owner' },
    { id: 'plan', label: 'A subscription on the default plan, with its usage limits' },
    { id: 'alerting', label: 'Alerting defaults for the workspace' },
  ];
}

/**
 * Blocks the form while the create request is in flight, then confirms the
 * result or explains the failure. It can only be dismissed once the request
 * has settled.
 */
export function OrgCreationDialog({ open, phase, orgName, slug, error, onRetry, onClose }: OrgCreationDialogProps) {
  const name = orgName.trim() || 'your organization';
  const settled = phase === 'failed';

  const title =
    phase === 'ready' ? `${name} is ready` : phase === 'failed' ? `Could not create ${name}` : `Creating ${name}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && settled) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="gap-5 p-5 sm:max-w-[440px]"
        onEscapeKeyDown={(event) => {
          if (!settled) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (!settled) event.preventDefault();
        }}
      >
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-[16px] leading-[1.3] tracking-[-0.01em]">{title}</DialogTitle>
          <DialogDescription asChild>
            <div role={phase === 'failed' ? 'alert' : 'status'} aria-live="polite">
              {phase === 'creating' && (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--text3)]" aria-hidden="true" />
                  This usually takes a few seconds.
                </span>
              )}
              {phase === 'ready' && 'Opening your dashboard…'}
              {phase === 'failed' && (error || 'The request failed. Check your connection and try again.')}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2.5 border-t border-[var(--border)] pt-4">
          <p className="text-[12px] text-[var(--text3)]">
            {phase === 'failed' ? 'Nothing was created, so it is safe to try again.' : 'Created together'}
          </p>
          <ul className="flex flex-col gap-2">
            {creationItems(slug).map((item) => (
              <li key={item.id} className="flex items-start gap-2.5 text-[13px] leading-[1.5]">
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-[3px] inline-flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
                    phase === 'ready'
                      ? 'border-[var(--green)]/40 bg-[var(--green-bg)] text-[var(--green)]'
                      : 'border-[var(--border2)] text-transparent',
                  )}
                >
                  <Check className="size-2.5 stroke-[3]" />
                </span>
                <span className={cn(phase === 'failed' ? 'text-[var(--text3)]' : 'text-[var(--text2)]')}>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {phase === 'failed' && (
          <DialogFooter className="-mx-5 -mb-5 px-5 py-3.5">
            <UiButton variant="ghost" size="lg" onClick={onClose}>
              Back to form
            </UiButton>
            <UiButton size="lg" onClick={onRetry}>
              Try again
            </UiButton>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
