import { useState } from 'react';
import { SectionBanner } from '../components/HelpSystem';
import type { SdkConfigState } from '../schema';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/shared/observe';
import { ShieldAlert, AlertTriangle, Flame, Power, ShieldCheck } from 'lucide-react';

interface KillswitchesTabProps {
  killswitches: SdkConfigState['killswitches'];
  onChange: (key: keyof SdkConfigState['killswitches'], value: boolean) => void;
}

const SWITCHES = [
  {
    key: 'disableSDK' as const,
    label: 'Killswitch: Entire SDK Distribution',
    desc: 'Immediately turns the SDK into a total no-op. All listeners, monkey-patches, and workers immediately cease execution.',
    severity: 'critical',
  },
  {
    key: 'disableTransport' as const,
    label: 'Killswitch: Telemetry Network Transport',
    desc: 'Halt all outgoing HTTP traffic to ingestion endpoints. Events are not dispatched over the network.',
    severity: 'high',
  },
  {
    key: 'disableErrors' as const,
    label: 'Killswitch: Error & Exception Capture',
    desc: 'Stops capturing unhandled exceptions and promise rejections.',
    severity: 'medium',
  },
  {
    key: 'disableLogs' as const,
    label: 'Killswitch: Log Shipping Pipeline',
    desc: 'Stops capturing structured log entries. Logs will print only to local console.',
    severity: 'medium',
  },
  {
    key: 'disableMetrics' as const,
    label: 'Killswitch: Metrics Egress',
    desc: 'Halts runtime and custom metric aggregation and dispatch.',
    severity: 'medium',
  },
  {
    key: 'disableTracing' as const,
    label: 'Killswitch: Distributed Tracing',
    desc: 'Stops trace generation and span tree assembly across all active requests.',
    severity: 'medium',
  },
  {
    key: 'disableProfiling' as const,
    label: 'Killswitch: CPU & Memory Profiling',
    desc: 'Stops continuous CPU and heap profiling to eliminate process CPU overhead.',
    severity: 'low',
  },
];

export function KillswitchesTab({ killswitches, onChange }: KillswitchesTabProps) {
  const [confirmKey, setConfirmKey] = useState<keyof SdkConfigState['killswitches'] | null>(null);

  const handleToggle = (key: keyof SdkConfigState['killswitches'], val: boolean) => {
    if (val) {
      setConfirmKey(key);
    } else {
      onChange(key, false);
      const switchDef = SWITCHES.find((s) => s.key === key);
      toast.success(`${switchDef?.label || key} disarmed successfully.`);
    }
  };

  const confirmToggle = () => {
    if (confirmKey) {
      onChange(confirmKey, true);
      const switchDef = SWITCHES.find((s) => s.key === confirmKey);
      toast.error(`${switchDef?.label || confirmKey} ARMED.`);
      setConfirmKey(null);
    }
  };

  const activeKillswitchesCount = Object.values(killswitches).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <SectionBanner title="Emergency Incident Response & Killswitches" type="danger">
        Emergency override switches for immediate operational mitigation. Arming a killswitch takes precedence over all other telemetry flags and suppresses matching telemetry across your entire connected SDK fleet.
      </SectionBanner>

      {/* Incident Status Banner */}
      <div
        className={cn(
          'flex items-center justify-between rounded-[var(--radius-lg)] border p-4.5 transition-colors',
          activeKillswitchesCount > 0
            ? 'border-[var(--red)]/40 bg-[var(--red-bg)] text-[var(--red)]'
            : 'border-[var(--border)] bg-[var(--bg1)] text-[var(--text2)]'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-9 items-center justify-center rounded-full border',
              activeKillswitchesCount > 0
                ? 'border-[var(--red)]/50 bg-[var(--red)] text-white animate-pulse'
                : 'border-[var(--border)] bg-[var(--bg2)] text-[var(--text3)]'
            )}
          >
            {activeKillswitchesCount > 0 ? <ShieldAlert className="size-4.5" /> : <ShieldCheck className="size-4.5" />}
          </div>
          <div>
            <h4 className="font-semibold text-[13.5px] text-[var(--text)]">
              {activeKillswitchesCount > 0
                ? `${activeKillswitchesCount} Emergency Killswitch${activeKillswitchesCount === 1 ? '' : 'es'} Armed`
                : 'All Telemetry Systems Operational'}
            </h4>
            <p className="text-[12px] text-[var(--text3)]">
              {activeKillswitchesCount > 0
                ? 'Telemetry is currently being actively suppressed on client SDKs.'
                : 'No emergency suppression rules are currently active.'}
            </p>
          </div>
        </div>
      </div>

      {/* Killswitch Table / Cards */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="eyebrow text-[var(--text3)]">Available Incident Triggers</span>
          <span className="font-mono text-[11px] text-[var(--text3)]">7 Controls</span>
        </div>

        <div className="flex flex-col gap-2.5">
          {SWITCHES.map(({ key, label, desc, severity }) => {
            const isArmed = killswitches[key];
            return (
              <div
                key={key}
                className={cn(
                  'flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[var(--radius-lg)] border p-4 transition-all',
                  isArmed
                    ? 'border-[var(--red)]/50 bg-[var(--red-bg)] shadow-xs'
                    : 'border-[var(--border)] bg-[var(--bg1)] hover:border-[var(--border2)]'
                )}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] border text-xs font-bold',
                      isArmed
                        ? 'border-[var(--red)] bg-[var(--red)] text-white'
                        : 'border-[var(--border)] bg-[var(--bg2)] text-[var(--text3)]'
                    )}
                  >
                    <Power className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn('font-semibold text-[13px]', isArmed ? 'text-[var(--red)] font-bold' : 'text-[var(--text)]')}>
                        {label}
                      </span>
                      {severity === 'critical' && (
                        <span className="rounded bg-[var(--red)]/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[var(--red)] border border-[var(--red)]/30">
                          Catastrophic
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12px] text-[var(--text3)] leading-relaxed">{desc}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
                  <span
                    className={cn(
                      'font-mono text-[11px] font-bold uppercase tracking-wider',
                      isArmed ? 'text-[var(--red)]' : 'text-[var(--text3)]'
                    )}
                  >
                    {isArmed ? 'ARMED' : 'Disarmed'}
                  </span>
                  <Switch
                    checked={isArmed}
                    onCheckedChange={(val) => handleToggle(key, val)}
                    aria-label={`Toggle killswitch ${label}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmKey && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[var(--overlay)] p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--red)]/40 bg-[var(--bg1)] p-6 shadow-[var(--shadow-modal)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-[var(--red)]">
              <AlertTriangle className="size-6 shrink-0" />
              <h2 className="text-[16px] font-bold font-[family-name:var(--display)]">Arm Emergency Killswitch?</h2>
            </div>

            <div className="mt-4 rounded-[var(--radius)] border border-[var(--red)]/40 bg-[var(--red)]/10 p-4">
              <p className="font-semibold text-xs text-[var(--red)]">{SWITCHES.find((s) => s.key === confirmKey)?.label}</p>
              <p className="mt-1 text-xs text-[var(--text2)] leading-relaxed">{SWITCHES.find((s) => s.key === confirmKey)?.desc}</p>
            </div>

            <p className="mt-4 text-xs text-[var(--text2)] leading-relaxed">
              Once published, this killswitch takes effect on the next SDK cache refresh (or immediate socket signal). Are you sure you want to arm this rule?
            </p>

            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmKey(null)}
                className="h-8.5 px-3 text-xs text-[var(--text2)] hover:text-[var(--text)]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmToggle}
                className="h-8.5 bg-[var(--red)] text-white hover:bg-[var(--red-d)] px-4 text-xs font-semibold gap-1.5"
              >
                <Flame className="size-3.5" />
                Confirm & Arm Killswitch
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
