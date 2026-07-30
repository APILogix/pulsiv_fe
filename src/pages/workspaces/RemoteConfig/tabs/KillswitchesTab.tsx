import { useState } from 'react';
import { SectionBanner } from '../components/HelpSystem';
import type { SdkConfigState } from '../schema';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/shared/observe';

interface KillswitchesTabProps {
  killswitches: SdkConfigState['killswitches'];
  onChange: (key: keyof SdkConfigState['killswitches'], value: boolean) => void;
}

export function KillswitchesTab({ killswitches, onChange }: KillswitchesTabProps) {
  const [confirmKey, setConfirmKey] = useState<keyof SdkConfigState['killswitches'] | null>(null);

  const switches = [
    { key: 'disableSDK' as const, icon: '💀', label: 'Disable Entire SDK', desc: 'Stops ALL telemetry collection and egress. The SDK becomes a no-op.' },
    { key: 'disableTransport' as const, icon: '🔌', label: 'Disable Transport', desc: 'Stops all data from being sent to Pulse. Events queue locally and are dropped when the queue fills.' },
    { key: 'disableErrors' as const, icon: '🐛', label: 'Disable Error Capture', desc: 'Stops error event collection. Unhandled exceptions are no longer reported.' },
    { key: 'disableLogs' as const, icon: '📝', label: 'Disable Logging', desc: 'Stops log shipping. Application logs are no longer sent to Pulse.' },
    { key: 'disableMetrics' as const, icon: '📈', label: 'Disable Metrics', desc: 'Stops all metrics collection and shipping.' },
    { key: 'disableTracing' as const, icon: '🔗', label: 'Disable Tracing', desc: 'Stops distributed trace generation. No spans are created.' },
    { key: 'disableProfiling' as const, icon: '🔬', label: 'Disable Profiling', desc: 'Stops CPU/memory profiling.' },
  ];

  const handleToggle = (key: keyof SdkConfigState['killswitches'], val: boolean) => {
    if (val) {
      // Trying to turn ON (arm killswitch) -> require confirm
      setConfirmKey(key);
    } else {
      // Turning OFF -> allow immediately
      onChange(key, false);
      toast.success(`${switches.find(s => s.key === key)?.label} disarmed.`);
    }
  };

  const confirmToggle = () => {
    if (confirmKey) {
      onChange(confirmKey, true);
      toast.error(`${switches.find(s => s.key === confirmKey)?.label} ARMED.`);
      setConfirmKey(null);
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <SectionBanner
        title="Danger Zone"
        type="danger"
      >
        Killswitches immediately disable SDK subsystems across ALL production instances. Use only during active incidents. Every toggle is logged, timestamped, and attributed to your account.
      </SectionBanner>

      <div className="rounded-[12px] border border-red-500/30 bg-red-500/5 shadow-sm">
        <div className="divide-y divide-red-500/20">
          {switches.map(({ key, icon, label, desc }) => {
            const isArmed = killswitches[key];
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center justify-between p-5 transition-colors",
                  isArmed ? "bg-red-500/10" : "hover:bg-red-500/5"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-red-500/20 text-[20px]">
                    {icon}
                  </div>
                  <div>
                    <h4 className={cn("font-semibold", isArmed ? "text-red-500" : "text-[var(--text)]")}>
                      {label}
                    </h4>
                    <p className={cn("mt-1 text-[13px] leading-relaxed", isArmed ? "text-red-400" : "text-[var(--text2)]")}>
                      {desc}
                    </p>
                  </div>
                </div>
                <div className="pl-4">
                  <Switch
                    checked={isArmed}
                    onCheckedChange={(val) => handleToggle(key, val)}
                    className={isArmed ? "!bg-red-500" : ""}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {confirmKey && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h2 className="text-[18px] font-semibold text-red-500">Arm Killswitch</h2>
            <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-4">
              <p className="font-medium text-[var(--text)]">
                {switches.find(s => s.key === confirmKey)?.label}
              </p>
              <p className="mt-1 text-[13px] text-[var(--text2)]">
                {switches.find(s => s.key === confirmKey)?.desc}
              </p>
            </div>
            <p className="mt-4 text-[14px] text-[var(--text)]">
              This affects ALL production instances immediately. This action is logged and audited. Are you absolutely sure?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmKey(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                className="bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500"
                onClick={confirmToggle}
              >
                Arm Killswitch
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
