import { useState } from 'react';
import { toast } from 'sonner';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

import { ConfirmDialog } from '@/modules/projects/components/project-ui';
import { Notice, Panel, Pill, RowStack, Toggle } from '@/shared/ui/pulse';

import { SectionBanner } from '../components/HelpSystem';
import type { SdkConfigState } from '../schema';

interface KillswitchesTabProps {
  killswitches: SdkConfigState['killswitches'];
  onChange: (key: keyof SdkConfigState['killswitches'], value: boolean) => void;
}

type KillswitchKey = keyof SdkConfigState['killswitches'];

interface SwitchDef {
  key: KillswitchKey;
  label: string;
  desc: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
}

const SWITCHES: SwitchDef[] = [
  {
    key: 'disableSDK',
    label: 'Entire SDK',
    desc: 'Turns the SDK into a no-op. Listeners, patches, and workers stop running.',
    impact: 'critical',
  },
  {
    key: 'disableTransport',
    label: 'Network transport',
    desc: 'Stops all outgoing traffic to ingestion endpoints. Events are not sent over the network.',
    impact: 'high',
  },
  {
    key: 'disableErrors',
    label: 'Error capture',
    desc: 'Stops capturing unhandled exceptions and promise rejections.',
    impact: 'medium',
  },
  {
    key: 'disableLogs',
    label: 'Log shipping',
    desc: 'Stops capturing structured log entries. Logs print only to the local console.',
    impact: 'medium',
  },
  {
    key: 'disableMetrics',
    label: 'Metrics',
    desc: 'Stops runtime and custom metric aggregation and dispatch.',
    impact: 'medium',
  },
  {
    key: 'disableTracing',
    label: 'Distributed tracing',
    desc: 'Stops trace generation and span assembly across all active requests.',
    impact: 'medium',
  },
  {
    key: 'disableProfiling',
    label: 'CPU and memory profiling',
    desc: 'Stops continuous CPU and heap profiling, removing its process overhead.',
    impact: 'low',
  },
];

const labelFor = (key: KillswitchKey) => SWITCHES.find((item) => item.key === key)?.label ?? key;

export function KillswitchesTab({ killswitches, onChange }: KillswitchesTabProps) {
  const [confirmKey, setConfirmKey] = useState<KillswitchKey | null>(null);
  const pendingSwitch = confirmKey ? SWITCHES.find((item) => item.key === confirmKey) : undefined;

  const handleToggle = (key: KillswitchKey, next: boolean) => {
    if (next) {
      // Arming always asks first; disarming is the safe direction.
      setConfirmKey(key);
      return;
    }
    onChange(key, false);
    toast.success(`Killswitch disarmed: ${labelFor(key).toLowerCase()}`, {
      description: 'Publish to apply it to connected SDKs.',
    });
  };

  const confirmArm = () => {
    if (!confirmKey) return;
    onChange(confirmKey, true);
    toast.warning(`Killswitch armed: ${labelFor(confirmKey).toLowerCase()}`, {
      description: 'Publish to apply it to connected SDKs.',
    });
    setConfirmKey(null);
  };

  const armedCount = SWITCHES.filter((item) => killswitches[item.key]).length;

  return (
    <div className="flex flex-col gap-6">
      <SectionBanner title="Killswitches" type="danger">
        Emergency overrides for incident mitigation. An armed killswitch takes precedence over every other telemetry
        setting and suppresses matching telemetry across all connected SDKs.
      </SectionBanner>

      {armedCount > 0 ? (
        <Notice tone="red" icon={ShieldAlert} title={`${armedCount} ${armedCount === 1 ? 'killswitch' : 'killswitches'} armed`}>
          Matching telemetry is suppressed on connected SDKs once this configuration is published.
        </Notice>
      ) : (
        <Notice icon={ShieldCheck} title="No killswitches armed">
          Telemetry follows the settings in the other sections.
        </Notice>
      )}

      <Panel
        title="Switches"
        description="Arming asks for confirmation. Changes apply after you publish."
        bodyClassName="p-0"
      >
        <RowStack>
          {SWITCHES.map(({ key, label, desc, impact }) => {
            const isArmed = killswitches[key];
            return (
              <div key={key} className="flex items-center justify-between gap-6 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-[var(--text)]">{label}</span>
                    {isArmed && (
                      <Pill tone="red" dot>
                        Armed
                      </Pill>
                    )}
                  </div>
                  <p className="mt-0.5 max-w-[68ch] text-[12px] leading-[1.5] text-[var(--text2)]">{desc}</p>
                  <p className="mt-1 font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">
                    {key} · {impact} impact
                  </p>
                </div>
                <Toggle
                  checked={isArmed}
                  onChange={(next) => handleToggle(key, next)}
                  label={`Killswitch for ${label.toLowerCase()}`}
                />
              </div>
            );
          })}
        </RowStack>
      </Panel>

      <ConfirmDialog
        open={pendingSwitch !== undefined}
        onOpenChange={(open) => {
          if (!open) setConfirmKey(null);
        }}
        title={pendingSwitch ? `Arm the ${pendingSwitch.label.toLowerCase()} killswitch?` : 'Arm killswitch?'}
        description={pendingSwitch?.desc}
        confirmLabel="Arm killswitch"
        onConfirm={confirmArm}
      >
        <p className="text-[13px] leading-[1.6] text-[var(--text2)]">
          It is added to this draft. After you publish, connected SDKs apply it on their next configuration refresh.
        </p>
      </ConfirmDialog>
    </div>
  );
}
