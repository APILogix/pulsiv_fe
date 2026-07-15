import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Moon } from "lucide-react";

export interface QuietHours {
  enabled: boolean;
  start: string; // HH:mm format
  end: string;
  timezone: string;
}

export interface QuietHoursPickerProps {
  value: QuietHours;
  onChange: (value: QuietHours) => void;
}

const HOURS = Array.from({ length: 24 }).map((_, i) => `${i.toString().padStart(2, "0")}:00`);
const TIMEZONES = (Intl as any).supportedValuesOf("timeZone");

export function QuietHoursPicker({ value, onChange }: QuietHoursPickerProps) {
  const switchId = "quiet-hours-enabled";
  const startId = "quiet-hours-start";
  const endId = "quiet-hours-end";
  const timezoneId = "quiet-hours-timezone";

  return (
    <div className="rounded-lg border p-4 bg-[var(--bg1)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-muted-foreground" />
          <div>
            <Label htmlFor={switchId} className="text-base font-medium">Quiet Hours</Label>
            <div className="text-xs text-muted-foreground">Pause notifications during these hours</div>
          </div>
        </div>
        <Switch 
          id={switchId}
          checked={value.enabled} 
          onCheckedChange={(enabled) => onChange({ ...value, enabled })} 
          aria-label="Enable quiet hours"
        />
      </div>

      {value.enabled && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[var(--border)] mt-4">
          <div className="space-y-1.5">
            <Label htmlFor={startId} className="text-xs">Start Time</Label>
            <select 
              id={startId}
              value={value.start} 
              onChange={(e) => onChange({ ...value, start: e.target.value })}
              aria-label="Start time"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="" disabled>Select time</option>
              {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor={endId} className="text-xs">End Time</Label>
            <select 
              id={endId}
              value={value.end} 
              onChange={(e) => onChange({ ...value, end: e.target.value })}
              aria-label="End time"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="" disabled>Select time</option>
              {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={timezoneId} className="text-xs">Timezone</Label>
            <select 
              id={timezoneId}
              value={value.timezone} 
              onChange={(e) => onChange({ ...value, timezone: e.target.value })}
              aria-label="Timezone"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="" disabled>Select timezone</option>
              {TIMEZONES.map((tz: string) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
