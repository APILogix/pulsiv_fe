import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  FileBarChart,
  FlaskConical,
  Gauge,
  Lightbulb,
  MessagesSquare,
  Settings2,
  Sparkles,
} from "lucide-react";
import { PageHero, Panel, Ring, StatCard, EmptyPanel, Notice, Pill } from "@/shared/ui/pulse";
import { Button, formatNumber, Timestamp } from "@/shared/observe";
import { AiLoadingBlock } from "@/modules/ai/components/states";
import { useAiCreditUsage } from "@/modules/ai/hooks/useAi";
import { useAssistantStore } from "@/modules/ai/store/assistant.store";
import { useReportsStore } from "@/modules/ai/store/reports.store";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";

const QUICK_ACTIONS = [
  { icon: MessagesSquare, title: "AI Assistant", desc: "Ask questions grounded in your monitoring data.", to: "/ai/assistant" },
  { icon: FlaskConical, title: "Investigations", desc: "Explain errors, traces, logs, and deployments.", to: "/ai/investigations" },
  { icon: FileBarChart, title: "Reports", desc: "Weekly, incident, and executive summaries.", to: "/ai/reports" },
  { icon: BookOpen, title: "Knowledge", desc: "Runbooks and documentation the AI can cite.", to: "/ai/knowledge" },
  { icon: Gauge, title: "Usage", desc: "Credits, requests, and cost visibility.", to: "/ai/usage" },
  { icon: Settings2, title: "Settings", desc: "Features, access, budgets, and limits.", to: "/ai/settings" },
];

export default function AiOverviewPage() {
  const navigate = useNavigate();
  const { activeOrgId } = useOrganizations();
  const usage = useAiCreditUsage();
  const conversations = useAssistantStore((s) => s.conversations);
  const records = useReportsStore((s) => s.records);
  const reports = useMemo(() => (activeOrgId ? records.filter((r) => r.orgId === activeOrgId) : []), [records, activeOrgId]);

  const credit = usage.data;
  const headroom =
    credit && credit.limit > 0 ? Math.round((credit.remaining / credit.limit) * 100) : null;

  const activity = [
    ...conversations.slice(0, 5).map((c) => ({
      id: `conv-${c.id}`,
      kind: "Conversation",
      title: c.title,
      at: c.updatedAt,
      to: "/ai/assistant",
    })),
    ...reports.slice(0, 5).map((r) => ({
      id: `rep-${r.jobId}`,
      kind: "Report",
      title: r.title,
      at: r.createdAt,
      to: "/ai/reports",
    })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="AI core"
        title="AI overview"
        description="A single view of your organization's AI health, recommendations, recent work, and credit consumption."
        icon={Sparkles}
        actions={
          <Button variant="primary" onClick={() => navigate("/ai/assistant")}>
            <MessagesSquare className="size-4" />
            Open assistant
          </Button>
        }
      />

      {/* KPIs */}
      {usage.isLoading ? (
        <AiLoadingBlock rows={1} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Credits remaining"
            value={credit ? formatNumber(credit.remaining) : "—"}
            icon={CreditCard}
            tone="ai"
            footnote={credit ? `${formatNumber(credit.limit)} monthly allowance` : "Usage unavailable"}
          />
          <StatCard
            label="Credits used"
            value={credit ? formatNumber(credit.used) : "—"}
            icon={Gauge}
            tone="brand"
          />
          <StatCard label="Conversations" value={formatNumber(conversations.length)} icon={MessagesSquare} tone="violet" />
          <StatCard label="Reports generated" value={formatNumber(reports.length)} icon={FileBarChart} tone="brand" />
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Health score */}
        <Panel title="AI Health" icon={Gauge} tone="ai">
          {headroom === null ? (
            <EmptyPanel
              icon={Gauge}
              title="No signal yet"
              description="Health reflects available AI credit headroom for the current cycle."
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-2">
              <Ring
                value={headroom}
                max={100}
                size={128}
                label={`${headroom}%`}
                sublabel="credit headroom"
                tone={headroom >= 50 ? "green" : headroom >= 20 ? "amber" : "red"}
              />
              <p className="text-center text-[12px] leading-[1.5] text-[var(--text2)]">
                {headroom >= 50
                  ? "Healthy. Ample AI credits remain this cycle."
                  : headroom >= 20
                    ? "Getting low. Consider reviewing budgets."
                    : "Critical. AI features may pause when credits run out."}
              </p>
            </div>
          )}
        </Panel>

        {/* Recommendations (derived from real signals, no fabricated data) */}
        <Panel title="AI recommendations" icon={Lightbulb} tone="ai">
          <div className="flex flex-col gap-3">
            {headroom !== null && headroom < 20 && (
              <Notice icon={CreditCard} tone="amber" title="Credits running low">
                Only {credit ? formatNumber(credit.remaining) : "a few"} credits remain. Raise the budget or limits in{" "}
                <Link to="/ai/settings" className="underline">
                  AI settings
                </Link>
                .
              </Notice>
            )}
            {conversations.length === 0 && (
              <Notice icon={MessagesSquare} tone="ai" title="Start with the assistant">
                Ask a grounded question about your errors, latency, or a recent deployment to see how the
                Assistant cites your monitoring data.
              </Notice>
            )}
            {reports.length === 0 && (
              <Notice icon={FileBarChart} tone="neutral" title="Generate your first report">
                Weekly and incident reports turn raw telemetry into a shareable summary.{" "}
                <Link to="/ai/reports" className="underline">
                  Create a report
                </Link>
                .
              </Notice>
            )}
            {headroom !== null && headroom >= 20 && conversations.length > 0 && reports.length > 0 && (
              <Notice icon={Lightbulb} tone="neutral" title="AI is configured">
                AI is configured and in use. Investigate an incident or schedule a weekly report to get more value.
              </Notice>
            )}
          </div>
        </Panel>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="group flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-colors duration-150 hover:border-[var(--ai-d)]"
          >
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--ai-bg)] text-[var(--ai)] ring-1 ring-inset ring-[var(--ai)]/25">
              <a.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--text)]">
                {a.title}
                <ArrowRight className="size-3.5 text-[var(--text3)] transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--text2)]">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <Panel title="Recent activity" icon={Sparkles}>
        {activity.length === 0 ? (
          <EmptyPanel
            icon={Sparkles}
            title="No recent AI activity"
            description="Conversations and reports you create will appear here."
            action={
              <Button variant="primary" onClick={() => navigate("/ai/assistant")}>
                Get started
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--border)]">
            {activity.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.to}
                  className="flex items-center gap-3 py-3 transition-colors hover:text-[var(--text)]"
                >
                  <Pill tone={item.kind === "Report" ? "brand" : "ai"}>{item.kind}</Pill>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text)]">{item.title}</span>
                  <span className="shrink-0 text-[12px] text-[var(--text3)]">
                    <Timestamp value={item.at} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
