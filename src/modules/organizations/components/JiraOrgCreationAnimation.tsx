/* Hallmark · component: org-creation-loader · genre: modern-minimal · theme: system
 * states: default · active · done · error · loading · reduced-motion
 * motion: transform + opacity only · ease-out-expo
 */

import { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, Loader2, RefreshCw, RotateCcw, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface OrgCreationStage {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly detail: string;
  readonly log: string;
}

export const WORKSPACE_CREATION_STAGES: readonly OrgCreationStage[] = [
  {
    id: 'namespace',
    code: '01',
    title: 'Tenant namespace',
    detail: 'Allocating organization container and slug route',
    log: 'pulse.tenant.namespace: reserved container and routing endpoints',
  },
  {
    id: 'security',
    code: '02',
    title: 'Security & access control',
    detail: 'Binding owner membership, cryptographic keys & IAM roles',
    log: 'pulse.iam.rbac: owner policy and root context attached',
  },
  {
    id: 'pipeline',
    code: '03',
    title: 'Telemetry & event queues',
    detail: 'Seeding Production environment, event streams & usage trackers',
    log: 'pulse.pipeline.seed: production telemetry pipeline initialized',
  },
  {
    id: 'infrastructure',
    code: '04',
    title: 'Alerting & workspace limits',
    detail: 'Configuring incident policies, health probes and default quotas',
    log: 'pulse.infra.alerting: baseline threshold policies compiled',
  },
  {
    id: 'dashboard',
    code: '05',
    title: 'Workspace dashboard',
    detail: 'Warming cache layers and compiling telemetry navigation index',
    log: 'pulse.workspace.ready: compiling developer dashboard assets',
  },
] as const;

// Telemetry logs that cycle continuously if the network / backend provisioning takes longer
const EXTENDED_LOGS = [
  'pulse.pipeline.ingest: verifying telemetry queues and event routes...',
  'pulse.security.keys: generating workspace credential bundle...',
  'pulse.storage.partition: allocating database partition tables...',
  'pulse.engine.sync: synchronizing real-time stream connectors...',
  'pulse.workspace.sync: completing workspace initialization...',
  'pulse.system.ready: waiting for primary cluster handoff...',
];

interface JiraOrgCreationAnimationProps {
  readonly open: boolean;
  readonly orgName: string;
  readonly slug?: string;
  readonly isComplete: boolean;
  readonly error: string | null;
  readonly onRetry?: () => void;
  readonly onCancel?: () => void;
  readonly onResetForm?: () => void;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function JiraOrgCreationAnimation({
  open,
  orgName,
  slug,
  isComplete,
  error,
  onRetry,
  onCancel,
  onResetForm,
}: JiraOrgCreationAnimationProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [extendedLogIndex, setExtendedLogIndex] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  // Reset and drive elapsed timer while open and active
  useEffect(() => {
    if (!open) {
      setElapsedMs(0);
      setExtendedLogIndex(0);
      return;
    }

    startTimeRef.current = Date.now();
    const interval = window.setInterval(() => {
      if (isComplete || error) return;
      const now = Date.now();
      const diff = now - startTimeRef.current;
      setElapsedMs(diff);
    }, 100);

    const logCycleInterval = window.setInterval(() => {
      if (isComplete || error) return;
      setExtendedLogIndex((prev) => (prev + 1) % EXTENDED_LOGS.length);
    }, 1600);

    return () => {
      window.clearInterval(interval);
      window.clearInterval(logCycleInterval);
    };
  }, [open, isComplete, error]);

  // Compute adaptive stage based on elapsed time (smoothly paces forward without freezing)
  const dynamicStageIndex = (() => {
    if (isComplete) return WORKSPACE_CREATION_STAGES.length - 1;
    if (elapsedMs < 700) return 0;
    if (elapsedMs < 1800) return 1;
    if (elapsedMs < 3400) return 2;
    if (elapsedMs < 5600) return 3;
    return 4;
  })();

  // Asymptotic progress bar: moves fast initially (10% -> 70%), then asymptotically creeps toward 95%, never stopping
  const progressRatio = (() => {
    if (error) return 0.5;
    if (isComplete) return 1;
    const seconds = elapsedMs / 1000;
    // Asymptotic curve approaching 0.95: 1 - e^(-seconds/2.8) * 0.9 + 0.1
    const asymptotic = 0.1 + (1 - Math.exp(-seconds / 2.8)) * 0.85;
    return Math.min(0.95, Math.max(0.12, asymptotic));
  })();

  const currentStage = WORKSPACE_CREATION_STAGES[dynamicStageIndex] ?? WORKSPACE_CREATION_STAGES[0];
  const activeLog = (() => {
    if (isComplete) return 'pulse.workspace.ready: setup complete · launching Sentinel Console';
    if (elapsedMs > 5000) return EXTENDED_LOGS[extendedLogIndex];
    return currentStage.log;
  })();

  const initialLetter = (orgName.trim()[0] || 'W').toUpperCase();
  const elapsedSeconds = (elapsedMs / 1000).toFixed(1);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          role="dialog"
          aria-modal="true"
          aria-label="Provisioning organization workspace"
        >
          <motion.div
            className="relative w-full max-w-[500px] overflow-hidden rounded-2xl border border-border/80 bg-[var(--bg1)] shadow-2xl shadow-black/60 ring-1 ring-white/5"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
          >
            {/* Header: Workspace Monogram + Live Telemetry Banner */}
            <div className="border-b border-border bg-[var(--bg)]/60 px-6 py-5">
              <div className="flex items-center gap-3.5">
                {/* Monogram with animated radar ring */}
                <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--brand)]/30 bg-[var(--bg2)] font-mono text-base font-bold text-[var(--text)] shadow-[0_0_15px_rgba(59,130,246,0.12)]">
                  {!isComplete && !error && (
                    <motion.span
                      className="absolute inset-0 rounded-xl border border-[var(--brand)]/40"
                      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  {initialLetter}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold tracking-tight text-[var(--text)]">
                      {orgName || 'Workspace'}
                    </p>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-[var(--text3)]">
                      <span className="inline-block size-1.5 rounded-full bg-[var(--brand)] animate-pulse" />
                      <span>{elapsedSeconds}s</span>
                      <span>·</span>
                      <span>{isComplete ? '05/05' : `0${dynamicStageIndex + 1}/05`}</span>
                    </div>
                  </div>

                  <div className="mt-0.5 flex items-center justify-between text-xs text-[var(--text2)]">
                    <div className="flex items-center gap-1.5 truncate">
                      {error ? (
                        <span className="inline-flex items-center gap-1 font-medium text-[var(--red)]">
                          <AlertCircle className="size-3.5" />
                          <span>Provisioning halted</span>
                        </span>
                      ) : isComplete ? (
                        <span className="inline-flex items-center gap-1 font-medium text-[var(--green)]">
                          <Check className="size-3.5 stroke-[2.5]" />
                          <span>Workspace ready</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[var(--brand)] font-medium">
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Provisioning cloud workspace…</span>
                        </span>
                      )}
                    </div>

                    {slug ? (
                      <span className="font-mono text-[10px] text-[var(--text3)] truncate max-w-[120px]">
                        /{slug}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* High-Tech Progress Line with Shimmer Beam */}
              <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg3)]">
                <motion.div
                  className="h-full origin-left rounded-full"
                  initial={{ scaleX: 0.1 }}
                  animate={{
                    scaleX: progressRatio,
                    backgroundColor: error ? 'var(--red)' : isComplete ? 'var(--green)' : 'var(--brand)',
                  }}
                  transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                />
                {!isComplete && !error && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                  />
                )}
              </div>
            </div>

            {/* Error View */}
            {error ? (
              <div className="p-6">
                <div className="rounded-xl border border-[rgba(239,68,68,0.3)] bg-[var(--red-bg)] p-4 text-xs text-[var(--red)] shadow-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-semibold">Creation encountered an error</p>
                      <p className="text-[12px] leading-relaxed opacity-95">{error}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-2.5">
                  {onResetForm ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onResetForm}
                      className="h-9 gap-1.5 border-border bg-[var(--bg2)] text-xs text-[var(--text2)] hover:text-[var(--text)]"
                    >
                      <RotateCcw className="size-3.5" />
                      <span>Reset Form</span>
                    </Button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    {onCancel && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        className="h-9 px-3.5 text-xs text-[var(--text2)]"
                      >
                        Back to form
                      </Button>
                    )}
                    {onRetry && (
                      <Button
                        type="button"
                        onClick={onRetry}
                        className="h-9 gap-1.5 bg-[var(--brand)] px-4 text-xs font-medium text-white hover:opacity-90 shadow-md shadow-[var(--brand)]/20"
                      >
                        <RefreshCw className="size-3.5" />
                        <span>Retry</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Stepped Progression List */
              <div className="p-6">
                <ol className="space-y-3" aria-live="polite">
                  {WORKSPACE_CREATION_STAGES.map((stage, idx) => {
                    const isDone = isComplete || idx < dynamicStageIndex;
                    const isActive = !isComplete && idx === dynamicStageIndex;
                    const isPending = !isComplete && idx > dynamicStageIndex;

                    return (
                      <li
                        key={stage.id}
                        className={`flex items-start gap-3.5 transition-all duration-200 ${
                          isPending ? 'opacity-35' : 'opacity-100'
                        }`}
                      >
                        {/* Step Marker */}
                        <div
                          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            isDone
                              ? 'border-[var(--green)] bg-[var(--green)]/15 text-[var(--green)]'
                              : isActive
                              ? 'border-[var(--brand)] bg-[var(--brand)]/15 shadow-[0_0_10px_rgba(59,130,246,0.25)]'
                              : 'border-border bg-[var(--bg2)] text-[var(--text3)]'
                          }`}
                        >
                          {isDone ? (
                            <svg viewBox="0 0 16 16" className="size-3" aria-hidden="true">
                              <motion.path
                                d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                              />
                            </svg>
                          ) : isActive ? (
                            <motion.span
                              className="size-2 rounded-full bg-[var(--brand)]"
                              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                            />
                          ) : (
                            <span className="font-mono text-[9px]">
                              {stage.code}
                            </span>
                          )}
                        </div>

                        {/* Title and Detail */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p
                              className={`text-xs font-semibold tracking-tight ${
                                isActive
                                  ? 'text-[var(--text)]'
                                  : isDone
                                  ? 'text-[var(--text)]'
                                  : 'text-[var(--text3)]'
                              }`}
                            >
                              {stage.title}
                            </p>
                            {isDone && (
                              <span className="font-mono text-[10px] font-medium text-[var(--green)]">done</span>
                            )}
                            {isActive && (
                              <span className="font-mono text-[10px] font-medium text-[var(--brand)] animate-pulse">active</span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-[var(--text3)]">
                            {stage.detail}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {/* Real-time Monospace Telemetry Stream Box */}
                <div className="mt-5 rounded-lg border border-border/80 bg-[var(--bg)] px-3.5 py-2.5 shadow-inner">
                  <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--text3)]">
                    <Terminal className="size-3 text-[var(--brand)] shrink-0" />
                    <span className="text-[var(--brand)] font-bold">›</span>
                    <span className="truncate text-[var(--text2)]">
                      {activeLog}
                    </span>
                    {!isComplete && (
                      <motion.span
                        className="inline-block h-3 w-1.5 bg-[var(--brand)]"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
