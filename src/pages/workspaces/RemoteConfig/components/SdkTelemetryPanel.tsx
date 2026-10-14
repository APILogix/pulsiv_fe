import {
  HIDE_BELOW_MD,
  HIDE_BELOW_SM,
  Readouts,
  Sheet,
  SheetCell,
  SheetRow,
  SheetTable,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Notice, Pill } from "@/shared/ui/pulse";

interface SdkTelemetryPanelProps {
  environmentName: string;
}

// Illustrative values only: nothing here is read from this project's SDKs.
const SAMPLE_PLATFORMS = [
  { name: "Web browser (JS/TS SDK)", connected: 840, version: "v2.4.2", health: "100%", lagging: false },
  { name: "Node.js ingestion service", connected: 380, version: "v2.4.1", health: "99.9%", lagging: false },
  { name: "Python FastAPI backends", connected: 140, version: "v2.3.9", health: "100%", lagging: false },
  { name: "iOS native app", connected: 45, version: "v2.2.0", health: "98.5%", lagging: true },
  { name: "Android app", connected: 15, version: "v2.1.8", health: "97.0%", lagging: true },
];

const SAMPLE_READOUTS: Readout[] = [
  { label: "Connected SDKs", value: "1,420", sub: "Sample value" },
  { label: "Sync success", value: "99.99%", sub: "Sample value" },
  { label: "Config refresh", value: "300s", sub: "Sample value" },
  { label: "Pending rollouts", value: "0", sub: "Sample value" },
];

const COLUMNS: SheetColumn[] = [
  { key: "platform", header: "SDK platform", className: "w-full" },
  { key: "instances", header: "Instances", align: "right", className: "w-[104px]" },
  { key: "version", header: "Version", className: `w-[96px] ${HIDE_BELOW_SM}` },
  { key: "health", header: "Refresh health", align: "right", className: `w-[128px] ${HIDE_BELOW_MD}` },
  { key: "status", header: "Status", className: "w-[104px]" },
];

export function SdkTelemetryPanel({ environmentName }: SdkTelemetryPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <Notice tone="neutral" title="Preview with sample data">
        This view will show connected SDK instances, adopted versions, and config refresh health for{" "}
        {environmentName}. The numbers below are examples, not live data from this project's SDKs.
      </Notice>

      <Readouts cells={SAMPLE_READOUTS} label="Sample SDK telemetry" />

      <Sheet title="SDK platforms" description="Sample platforms and versions, to show how this table will read.">
        <SheetTable columns={COLUMNS} caption="Sample SDK platforms" minWidth={440}>
          {SAMPLE_PLATFORMS.map((platform) => (
            <SheetRow key={platform.name}>
              <SheetCell className="w-full max-w-0">
                <span className="block truncate text-[13px] font-medium text-[var(--text)]">{platform.name}</span>
              </SheetCell>
              <SheetCell align="right">
                <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums">{platform.connected}</span>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_SM}>
                <code className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{platform.version}</code>
              </SheetCell>
              <SheetCell align="right" className={HIDE_BELOW_MD}>
                <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">{platform.health}</span>
              </SheetCell>
              <SheetCell>
                <Pill tone={platform.lagging ? "amber" : "green"} dot>
                  {platform.lagging ? "Lagging" : "Online"}
                </Pill>
              </SheetCell>
            </SheetRow>
          ))}
        </SheetTable>
      </Sheet>
    </div>
  );
}
