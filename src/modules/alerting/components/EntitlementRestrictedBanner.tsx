import { Link } from "react-router";
import {
  Mail,
  Sparkles,
  Lock,
  Hash,
  MessageSquare,
  Users,
  Radio,
  Webhook,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Plug,
  Info,
} from "lucide-react";
import { useNotificationEntitlement, useProjectAlertingStatus } from "../hooks/useAlerting";
import { useProjectMembers } from "@/modules/projects/hooks/useMembers";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { orgRoutes } from "@/app/router/org-routes";
import { cn } from "@/lib/utils";

interface EntitlementRestrictedBannerProps {
  projectId?: string;
  className?: string;
  showOwnerDetails?: boolean;
}

export function EntitlementRestrictedBanner({
  projectId,
  className,
  showOwnerDetails = true,
}: EntitlementRestrictedBannerProps) {
  const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);
  const { isRestricted, isLoading: entitlementLoading } = useNotificationEntitlement();
  const { data: alertingStatus } = useProjectAlertingStatus(projectId);
  const { data: memberPage } = useProjectMembers(projectId ?? "", { status: "active" });

  const members = memberPage?.data ?? (memberPage as any)?.members ?? [];
  const ownerMember = members.find((m: any) => m.role === "owner") ?? members[0];
  const ownerUser = ownerMember?.user;
  const ownerEmail = alertingStatus?.projectOwner?.email || ownerUser?.email;
  const ownerName = ownerUser?.fullName || (ownerEmail ? ownerEmail.split("@")[0] : "Project Owner");
  const initials = (ownerName || "PO")
    .split(" ")
    .map((part: string) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Case 1: Plan has NO connector entitlement (Email only fallback)
  if (isRestricted || (alertingStatus && !alertingStatus.connectorAccess.allowed)) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.07] via-[var(--bg2)]/80 to-[var(--bg2)]/40 p-4 sm:p-5 text-[13px] text-[var(--text)] shadow-sm backdrop-blur-md transition-all",
          className,
        )}
        role="region"
        aria-label="Email-only alert delivery notice"
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-amber-500/10 blur-2xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.12)]">
              <Mail className="size-4.5" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13.5px] font-semibold tracking-tight text-[var(--text)]">
                  Email fallback is active
                </span>
                <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[10.5px] font-medium text-amber-300">
                  Plan Quota
                </span>
              </div>

              <p className="max-w-[68ch] text-[12.5px] leading-relaxed text-[var(--text2)]">
                Your current plan doesn't include notification connectors. Alerts will continue to be safely sent to the project owner by email.
              </p>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-medium text-muted-foreground">Locked channels:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground opacity-75">
                    <Hash className="size-3 text-muted-foreground" />
                    <span>Slack</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground opacity-75">
                    <MessageSquare className="size-3 text-muted-foreground" />
                    <span>Discord</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground opacity-75">
                    <Users className="size-3 text-muted-foreground" />
                    <span>Teams</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground opacity-75">
                    <Radio className="size-3 text-muted-foreground" />
                    <span>PagerDuty</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground opacity-75">
                    <Webhook className="size-3 text-muted-foreground" />
                    <span>Webhook</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                    <Lock className="size-2.5" />
                    <span>Pro</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Link
            to={orgRoutes.billing(activeOrgSlug)}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-semibold text-zinc-950 shadow-md shadow-amber-500/20 transition-all duration-200 hover:from-amber-400 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:self-center"
          >
            <Sparkles className="size-3.5 fill-current text-zinc-950" aria-hidden="true" />
            <span>Upgrade plan</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>

        {showOwnerDetails && projectId && (
          <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] text-muted-foreground">Currently routing to:</span>
              <div className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background/60 px-2.5 py-1">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-semibold text-[var(--text)]">
                  {initials}
                </div>
                <span className="font-medium text-[var(--text)]">{ownerName}</span>
                <span className="text-[11px] text-muted-foreground">
                  ({ownerEmail || "No verified email configured"})
                </span>
                {ownerEmail && (
                  <CheckCircle2 className="size-3.5 text-emerald-500/80" aria-label="Verified recipient" />
                )}
              </div>
            </div>

            {!ownerEmail && (
              <div className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-400">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>Owner email unverified — please configure verified profile email</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Case 2: Plan HAS connector entitlement, but NO connector is configured
  if (alertingStatus && alertingStatus.connectorAccess.allowed && !alertingStatus.connectorStatus.configured) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/[0.07] via-[var(--bg2)]/80 to-[var(--bg2)]/40 p-4 sm:p-5 text-[13px] text-[var(--text)] shadow-sm backdrop-blur-md transition-all",
          className,
        )}
        role="region"
        aria-label="No connector configured notice"
      >
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-500/20 to-sky-600/10 text-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.12)]">
              <Plug className="size-4.5" aria-hidden="true" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13.5px] font-semibold tracking-tight text-[var(--text)]">
                  No notification connector configured
                </span>
                <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/15 px-2.5 py-0.5 text-[10.5px] font-medium text-sky-300">
                  Connectors Available
                </span>
              </div>

              <p className="max-w-[68ch] text-[12.5px] leading-relaxed text-[var(--text2)]">
                Alerts will currently be sent to the project owner by email. Configure a connector to route notifications directly to Slack, PagerDuty, Discord, or webhooks.
              </p>
            </div>
          </div>

          <Link
            to={orgRoutes.connectors(activeOrgSlug, "integrations")}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sky-500/20 transition-all duration-200 hover:from-sky-400 hover:to-sky-500 hover:shadow-lg hover:shadow-sky-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:self-center"
          >
            <Plug className="size-3.5" aria-hidden="true" />
            <span>Configure connector</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>

        {showOwnerDetails && projectId && (
          <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] text-muted-foreground">Default destination:</span>
              <div className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background/60 px-2.5 py-1">
                <Mail className="size-3.5 text-muted-foreground" />
                <span className="font-medium text-[var(--text)]">{ownerEmail || "Project Owner Email"}</span>
                {ownerEmail && (
                  <CheckCircle2 className="size-3.5 text-emerald-500/80" aria-label="Verified recipient" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
