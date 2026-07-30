import { SectionBanner, FieldTooltip } from '../components/HelpSystem';
import type { SdkConfigState } from '../schema';

interface SamplingTabProps {
  sampling: SdkConfigState['sampling'];
  onChange: (key: keyof SdkConfigState['sampling'], value: number) => void;
}

export function SamplingTab({ sampling, onChange }: SamplingTabProps) {
  const sliders = [
    {
      key: 'errors' as const,
      label: 'Errors',
      tooltip: 'Percentage of error events that are actually sent. 100% = every error is captured. Lower this only if error volume is overwhelming your quota.',
    },
    {
      key: 'traces' as const,
      label: 'Traces',
      tooltip: 'Percentage of requests that generate a full trace. At high traffic, 100% can be expensive. Consider 10–50% for services handling >10K req/s.',
    },
    {
      key: 'metrics' as const,
      label: 'Metrics',
      tooltip: 'Percentage of metric data points that are sent. Usually keep at 100%.',
    },
    {
      key: 'requests' as const,
      label: 'Requests',
      tooltip: 'Percentage of HTTP requests whose metadata is captured.',
    },
    {
      key: 'replays' as const,
      label: 'Session Replays',
      tooltip: 'Percentage of user sessions that are recorded. Replays are storage-heavy. 10% is typical for production.',
    },
    {
      key: 'profiles' as const,
      label: 'Profiles',
      tooltip: 'Percentage of requests that trigger a CPU/memory profile. Profiling is expensive. Keep low.',
    },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <SectionBanner
        title="Dynamic Sampling"
        definition="Sampling reduces the volume of data sent by the SDK by randomly dropping a percentage of events. This is typically used to manage quotas, control costs, and reduce the processing overhead of high-frequency signals like traces or profiles."
      >
        Adjust data volumes at the edge before they hit the network.
      </SectionBanner>

      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          {sliders.map((slider) => {
            const value = sampling[slider.key];
            return (
              <div key={slider.key} className="flex items-center gap-4">
                <div className="flex w-[160px] shrink-0 items-center">
                  <label className="font-medium text-[14px] text-[var(--text)]">{slider.label}</label>
                  <FieldTooltip definition={slider.tooltip} />
                </div>
                <div className="relative flex-1 group">
                  {/* Track background */}
                  <div className="absolute top-1/2 left-0 h-1.5 w-full -translate-y-1/2 rounded-full bg-[var(--bg3)] overflow-hidden">
                     <div 
                        className="h-full bg-[var(--brand)] transition-all duration-150 ease-out" 
                        style={{ width: `${value}%` }} 
                     />
                  </div>
                  
                  {/* Native input layered on top, invisible but interactive */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={value}
                    onChange={(e) => onChange(slider.key, Number(e.target.value))}
                    className="relative z-10 h-6 w-full cursor-pointer opacity-0"
                  />
                  
                  {/* Custom thumb that follows the value (purely visual) */}
                  <div 
                    className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-[2px] border-[var(--brand)] bg-[var(--bg1)] shadow-[0_0_8px_rgba(99,102,241,0.4)] transition-all duration-150 ease-out group-hover:scale-110"
                    style={{ left: `${value}%` }}
                  />
                </div>
                <div className="w-[60px] shrink-0 text-right font-mono text-[14px] font-semibold text-[var(--brand)]">
                  {value}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
