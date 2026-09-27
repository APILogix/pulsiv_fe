import React, { useState } from 'react';
import { toast } from './sonner';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Sparkles,
  Zap,
  Copy,
  Loader2,
  Bell,
  X,
} from 'lucide-react';

export function ToastShowcase() {
  const [isOpen, setIsOpen] = useState(false);

  const triggerSuccess = () => {
    toast.success('Configuration Published', {
      description: 'SDK remote config revision #14 successfully applied to production.',
    });
  };

  const triggerError = () => {
    toast.error('Ingestion Pipeline Error', {
      description: 'Network timeout: Ingestion gateway connection dropped (504 Gateway Timeout).',
    });
  };

  const triggerWarning = () => {
    toast.warning('High Ingest Rate Warning', {
      description: 'Ingestion rate reached 4,850 RPS, exceeding 90% of provisioned capacity.',
    });
  };

  const triggerInfo = () => {
    toast.info('Database Migration Complete', {
      description: '000005_weighted_event_credit_billing schema successfully synchronized.',
    });
  };

  const triggerAi = () => {
    toast.ai('AI Anomaly Detected', {
      description: 'Unusual spike in 500 error rates detected on route /v1/ingest/batch.',
    });
  };

  const triggerQuota = () => {
    toast.quota('Credit Quota Approaching', {
      description: 'Your organization has consumed 91.4% of monthly billable credits.',
    });
  };

  const triggerCopy = () => {
    toast.copy('pk_live_49f821ae027b490c883', 'API key copied');
  };

  const triggerPromise = () => {
    const promise = new Promise<{ name: string }>((resolve, reject) => {
      setTimeout(() => {
        Math.random() > 0.3 ? resolve({ name: 'telemetry_archive_2026.parquet' }) : reject(new Error('S3 Egress Timeout'));
      }, 1800);
    });

    toast.promise(promise, {
      loading: 'Packaging and exporting telemetry logs...',
      success: (data) => `Export finished: ${data.name}`,
      error: 'Telemetry log export failed: S3 connection timeout',
    });
  };

  const triggerAction = () => {
    toast('Security Policy Changed', {
      description: 'MFA requirement enabled for all organization members.',
      action: {
        label: 'View Audit',
        onClick: () => console.log('Audit clicked'),
      },
      cancel: {
        label: 'Dismiss',
        onClick: () => console.log('Dismiss clicked'),
      },
    });
  };

  return (
    <>
      {/* Floating preview trigger for development & auditing */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Open Toast Design Preview"
        className="fixed bottom-5 right-5 z-[99990] flex items-center gap-2 px-3 py-2 rounded-full bg-[rgba(18,20,28,0.92)] hover:bg-[rgba(26,30,42,0.95)] text-zinc-300 hover:text-white border border-zinc-700/60 hover:border-zinc-500 shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-md text-xs font-mono transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer group"
      >
        <Bell className="size-3.5 text-[var(--brand)] transition-transform group-hover:rotate-12" />
        <span className="font-sans font-medium text-[11px] text-zinc-200">Toast Preview</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-[99995] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-[540px] rounded-xl bg-[var(--bg1,#111113)] border border-[var(--border,#26262a)] shadow-[0_24px_64px_rgba(0,0,0,0.85)] p-6 overflow-hidden">
            {/* Top hairline */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border,#26262a)]">
              <div>
                <h3 className="text-[15px] font-semibold text-white tracking-[-0.01em]">
                  Sentinel Toast Showcase
                </h3>
                <p className="text-[12px] text-zinc-400 mt-0.5">
                  Test and inspect the redesigned Obsidian toast theme across all channels.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="size-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Buttons grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-5 pb-2">
              <button
                type="button"
                onClick={triggerSuccess}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-[rgba(52,211,153,0.08)] hover:bg-[rgba(52,211,153,0.14)] border border-[rgba(52,211,153,0.25)] hover:border-[rgba(52,211,153,0.4)] text-[var(--green,#34d399)] text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <CheckCircle2 className="size-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-white">Success</div>
                  <div className="text-[10px] text-zinc-400 font-mono">Truth / Green</div>
                </div>
              </button>

              <button
                type="button"
                onClick={triggerError}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-[rgba(239,68,68,0.08)] hover:bg-[rgba(239,68,68,0.14)] border border-[rgba(239,68,68,0.25)] hover:border-[rgba(239,68,68,0.4)] text-[var(--red,#ef4444)] text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <AlertCircle className="size-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-white">Error</div>
                  <div className="text-[10px] text-zinc-400 font-mono">Truth / Red</div>
                </div>
              </button>

              <button
                type="button"
                onClick={triggerWarning}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-[rgba(245,158,11,0.08)] hover:bg-[rgba(245,158,11,0.14)] border border-[rgba(245,158,11,0.25)] hover:border-[rgba(245,158,11,0.4)] text-[var(--amber,#f59e0b)] text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <AlertTriangle className="size-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-white">Warning</div>
                  <div className="text-[10px] text-zinc-400 font-mono">Truth / Amber</div>
                </div>
              </button>

              <button
                type="button"
                onClick={triggerInfo}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-[rgba(96,165,250,0.08)] hover:bg-[rgba(96,165,250,0.14)] border border-[rgba(96,165,250,0.25)] hover:border-[rgba(96,165,250,0.4)] text-[var(--blue,#60a5fa)] text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <Info className="size-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-white">Info</div>
                  <div className="text-[10px] text-zinc-400 font-mono">Blue / Telemetry</div>
                </div>
              </button>

              <button
                type="button"
                onClick={triggerAi}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-[rgba(34,211,238,0.08)] hover:bg-[rgba(34,211,238,0.14)] border border-[rgba(34,211,238,0.25)] hover:border-[rgba(34,211,238,0.4)] text-[var(--ai,#22d3ee)] text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <Sparkles className="size-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-white">AI Insight</div>
                  <div className="text-[10px] text-zinc-400 font-mono">AI / Cyan</div>
                </div>
              </button>

              <button
                type="button"
                onClick={triggerQuota}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-[rgba(245,158,11,0.08)] hover:bg-[rgba(245,158,11,0.14)] border border-[rgba(245,158,11,0.25)] hover:border-[rgba(245,158,11,0.4)] text-[var(--amber,#f59e0b)] text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <Zap className="size-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-white">Quota Alert</div>
                  <div className="text-[10px] text-zinc-400 font-mono">Credits / Limit</div>
                </div>
              </button>

              <button
                type="button"
                onClick={triggerCopy}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/60 hover:border-zinc-500 text-zinc-200 text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <Copy className="size-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-white">Copy Code</div>
                  <div className="text-[10px] text-zinc-400 font-mono">Monospace Tag</div>
                </div>
              </button>

              <button
                type="button"
                onClick={triggerPromise}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/60 hover:border-zinc-500 text-zinc-200 text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <Loader2 className="size-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-white">Promise</div>
                  <div className="text-[10px] text-zinc-400 font-mono">Async Loading</div>
                </div>
              </button>

              <button
                type="button"
                onClick={triggerAction}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/60 hover:border-zinc-500 text-zinc-200 text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <Bell className="size-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-white">Action Toast</div>
                  <div className="text-[10px] text-zinc-400 font-mono">With Buttons</div>
                </div>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border,#26262a)] flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Close Showcase
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
