import { useMemo } from "react";
import { Link } from "react-router";
import {
  Activity,
  AlertOctagon,
  Mail,
  Zap,
} from "lucide-react";
import {
  useAlertEvents,
  useAlertEventStats,
  useAlertRules,
  useDeadLetters,
  useNotificationEntitlement,
} from "../hooks/useAlerting";
import { cn } from "@/lib/utils";

interface AlertOverviewWidgetProps {
  className?: string;
  projectId?: string;
}

export function AlertOverviewWidget({ className }: AlertOverviewWidgetProps) {
  const { data: stats } = useAlertEventStats();
  const { data: eventsData } = useAlertEvents({ limit: 100 });
  const { data: rulesData } = useAlertRules();
  const { data: deadLettersData } = useDeadLetters({ limit: 5 });
  const { isRestricted } = useNotificationEntitlement();

  const activeEvents = useMemo(() => {
    return ((eventsData?.data ?? []) as any[]).filter(
      (e: any) => e.status === "firing" || e.status === "pending" || e.status === "processing",
    );
  }, [eventsData]);

  const severityCounts = useMemo(() => {
    const counts = { critical: 0, error: 0, warning: 0, info: 0 };
    for (const e of activeEvents) {
      if (e.severity in counts) {
        counts[e.severity as keyof typeof counts]++;
      }
    }
    return counts;
  }, [activeEvents]);

  const totalRules = rulesData?.total ?? (rulesData?.data?.length ?? 0);
  const enabledRules = ((rulesData?.data ?? []) as any[]).filter((r: any) => r.enabled).length;

  const isHealthy = activeEvents.length === 0;
  const deadLettersCount = deadLettersData?.total ?? (deadLettersData?.data?.length ?? 0);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Top Headline Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* System Health */}
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card/60 p-4 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Alerting Health</span>
            <div className={cn(
              "flex size-2 rounded-full",
              isHealthy ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
            )} />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={cn("text-2xl font-bold font-mono", isHealthy ? "text-emerald-400" : "text-rose-400")}>
              {isHealthy ? "Healthy" : `${activeEvents.length} Active`}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2">
            <span>{enabledRules} of {totalRules} rules active</span>
            <Link to="/alerts/rules" className="text-[var(--brand)] hover:underline">
              Rules →
            </Link>
          </div>
        </div>

        {/* Active Incidents & Breakdown */}
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card/60 p-4 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Active Incidents</span>
            <AlertOctagon className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-2xl font-bold font-mono text-[var(--text)]">
              {stats?.active ?? activeEvents.length}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              {severityCounts.critical > 0 && (
                <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-rose-400 font-semibold">
                  {severityCounts.critical} crit
                </span>
              )}
              {severityCounts.error > 0 && (
                <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-400 font-semibold">
                  {severityCounts.error} err
                </span>
              )}
              {severityCounts.warning > 0 && (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-400">
                  {severityCounts.warning} warn
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2">
            <span>Acked: {stats?.acknowledged ?? 0}</span>
            <Link to="/alerts" className="text-[var(--brand)] hover:underline">
              Incidents →
            </Link>
          </div>
        </div>

        {/* 24h Triggered & Recovery */}
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card/60 p-4 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">24h Event Volume</span>
            <Activity className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[var(--text)]">
              {stats?.total24h ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">triggered</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2">
            <span>Resolved 24h: {stats?.resolved24h ?? 0}</span>
            {stats?.mttrMinutes !== null && stats?.mttrMinutes !== undefined && (
              <span className="font-mono">MTTR: {Math.round(stats.mttrMinutes)}m</span>
            )}
          </div>
        </div>

        {/* Delivery & Entitlement State */}
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card/60 p-4 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Delivery Mode</span>
            {isRestricted ? (
              <Mail className="size-4 text-amber-400" />
            ) : (
              <Zap className="size-4 text-emerald-400" />
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-base font-semibold text-[var(--text)]">
              {isRestricted ? "Email-Only Mode" : "Connectors Active"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2">
            {deadLettersCount > 0 ? (
              <span className="text-rose-400 font-medium">
                {deadLettersCount} failed / DLQ
              </span>
            ) : (
              <span className="text-emerald-400">0 DLQ failures</span>
            )}
            <Link to="/alerts/dead-letters" className="text-[var(--brand)] hover:underline">
              DLQ →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
