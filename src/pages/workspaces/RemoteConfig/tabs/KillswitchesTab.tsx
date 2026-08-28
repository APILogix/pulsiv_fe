import { useState } from 'react';
import { SectionBanner } from '../components/HelpSystem';
import type { SdkConfigState } from '../schema';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/shared/observe';
import { ShieldAlert, AlertTriangle, Flame } from 'lucide-react';

interface KillswitchesTabProps {
  killswitches: SdkConfigState['killswitches'];
  onChange: (key: keyof SdkConfigState['killswitches'], value: boolean) => void;
}

const SWITCHES = [
  { key: 'disableSDK' as const, label: 'Disable Entire SDK', desc: 'Stops ALL telemetry collection and egress. The SDK becomes a no-op.' },
  { key: 'disableTransport' as const, label: 'Disable Transport', desc: 'Stops all data from being sent to Pulse. Events queue locally and are dropped when full.' },
  { key: 'disableErrors' as const, label: 'Disable Error Capture', desc: 'Stops error event collection. Unhandled exceptions are no longer reported.' },
  { key: 'disableLogs' as const, label: 'Disable Logging', desc: 'Stops log shipping. Application logs are no longer sent to Pulse.' },
  { key: 'disableMetrics' as const, label: 'Disable Metrics', desc: 'Stops all metrics collection and shipping.' },
  { key: 'disableTracing' as const, label: 'Disable Tracing', desc: 'Stops distributed trace generation. No spans are created.' },
  { key: 'disableProfiling' as const, label: 'Disable Profiling', desc: 'Stops CPU/memory profiling.' },
];

export function KillswitchesTab({ killswitches, onChange }: KillswitchesTabProps) {
  const [confirmKey, setConfirmKey] = useState<keyof SdkConfigState['killswitches'] | null>(null);

  const handleToggle = (key: keyof SdkConfigState['killswitches'], val: boolean) => {
    if (val) {
      setConfirmKey(key);
    } else {
      onChange(key, false);
      toast.success(`${SWITCHES.find((s) => s.key === key)?.label} disarmed.`);
    }
  };

  const confirmToggle = () => {
    if (confirmKey) {
      onChange(confirmKey, true);
      toast.error(`${SWITCHES.find((s) => s.key === confirmKey)?.label} ARMED.`);
      setConfirmKey(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <SectionBanner title="Emergency Incident Controls & Killswitches" type="danger">
        Emergency override switches for immediate incident mitigation. Arming a killswitch immediately halts telemetry across connected SDK fleets.
      </SectionBanner>

      <div className="rounded-[var(--radius-lg)] border border-[var(--red)]/40 bg-[var(--red)]/5 overflow-hidden">
        <div className="border-b border-[var(--red)]/30 px-5 py-4 flex items-center justify-between bg-[var(--red)]/10">
          <h3 className="font-bold text-[14px] text-[var(--red)] flex items-center gap-2">
            <ShieldAlert className="size-4 text-[var(--red)] animate-pulse" /> Emergency Killswitch Panel
          </h3>
          <span className="text-[11px] font-mono font-bold text-[var(--red)]">7 Emergency Triggers</span>
        </div>

        <div className="divide-y divide-[var(--red)]/20">
          {SWITCHES.map(({ key, label, desc }) => {
            const isArmed = killswitches[key];
            return (
              <div key={key} className={cn('flex items-center justify-between p-5 transition-colors', isArmed ? 'bg-[var(--red)]/20' : 'hover:bg-[var(--red)]/10')}>
                <div className="flex items-start gap-4">
                  <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] font-bold text-sm border", isArmed ? "bg-[var(--red)] text-white border-[var(--red-d)]" : "bg-[var(--red)]/20 text-[var(--red)] border-[var(--red)]/30")}>
                    <Flame className="size-5" />
                  </div>
                  <div>
                    <h4 className={cn('font-bold text-[14px]', isArmed ? 'text-[var(--red)]' : 'text-[var(--text)]')}>{label}</h4>
                    <p className={cn('mt-0.5 text-[12px]', isArmed ? 'text-[var(--red)] font-semibold' : 'text-[var(--text3)]')}>{desc}</p>
                  </div>
                </div>
                <div className="pl-4">
                  <Switch checked={isArmed} onCheckedChange={(val) => handleToggle(key, val)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {confirmKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4">
          <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--red)]/40 bg-[var(--bg1)] p-6 shadow-[var(--shadow-modal)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-[var(--red)]">
              <AlertTriangle className="size-6 shrink-0" />
              <h2 className="text-[17px] font-bold">Arm Emergency Killswitch?</h2>
            </div>

            <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--red)]/40 bg-[var(--red)]/10 p-4">
              <p className="font-bold text-sm text-[var(--red)]">{SWITCHES.find((s) => s.key === confirmKey)?.label}</p>
              <p className="mt-1 text-xs text-[var(--text2)]">{SWITCHES.find((s) => s.key === confirmKey)?.desc}</p>
            </div>

            <p className="mt-4 text-xs text-[var(--text2)] leading-relaxed">
              This action takes effect immediately across all active SDK instances. Are you sure you want to proceed?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setConfirmKey(null)} className="h-9 px-4 text-xs">
                Cancel
              </Button>
              <Button type="button" className="h-9 px-4 text-xs font-bold bg-[var(--red-d)] hover:bg-[var(--red)] text-white" onClick={confirmToggle}>
                Arm Killswitch Immediately
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
