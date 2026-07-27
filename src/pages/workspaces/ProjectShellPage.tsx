import { createContext, useContext } from "react";
import { Link, NavLink, Navigate, Outlet, useParams } from "react-router";
import {
  Activity,
  Archive,
  Bell,
  BellRing,
  Cable,
  FolderOpen,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Layers,
  LineChart,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  ScrollText,
  Settings,

  Sliders,

  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useProject, useProjectMutations } from "@/modules/projects/hooks/useProjects";
import type { Project, ProjectStatus } from "@/modules/projects/api/types";
import { DetailSkeleton } from "@/shared/observe";
import { Breadcrumbs, IconChip, Pill, type SurfaceTone } from "@/shared/ui/pulse";
import { Button as UiButton } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// ── project context ──────────────────────────────────────────

interface ProjectContextValue {
  project: Project;
  projectId: string;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useCurrentProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useCurrentProject must be used within ProjectShellPage");
  return ctx;
}

// ── module-level constants (rules.md §1.2) ───────────────────

export const PROJECT_STATUS_TONE: Record<ProjectStatus, SurfaceTone> = {
  active: "green",
  paused: "amber",
  archived: "neutral",
};

interface ShellTab {
  label: string;
  to: string;
  icon: LucideIcon;
  group: string;
}

const SHELL_TABS: ShellTab[] = [
  { label: "Overview", to: "overview", icon: LayoutDashboard, group: "Insight" },
  { label: "Analytics", to: "analytics", icon: LineChart, group: "Insight" },
  { label: "Usage", to: "usage", icon: Gauge, group: "Insight" },
  { label: "Activity", to: "activity", icon: ScrollText, group: "Insight" },

  { label: "Environments", to: "environments", icon: Layers, group: "Configure" },
  { label: "API keys", to: "api-keys", icon: KeyRound, group: "Configure" },
  { label: "Remote config", to: "remote-config", icon: Sliders, group: "Configure" },
  { label: "Settings", to: "settings/general", icon: Settings, group: "Configure" },

  { label: "Members", to: "members", icon: Users, group: "Access" },

  { label: "Thresholds", to: "alert-thresholds", icon: BellRing, group: "Alerting" },
  { label: "Channels", to: "alert-channels", icon: Bell, group: "Alerting" },
  { label: "Routes", to: "routes", icon: Activity, group: "Alerting" },
  { label: "Connectors", to: "connectors", icon: Cable, group: "Alerting" },
  { label: "My notifications", to: "preferences", icon: Bell, group: "Alerting" },
];

const TAB_GROUPS = ["Insight", "Configure", "Access", "Alerting"] as const;

// ── sub-navigation ───────────────────────────────────────────

function ShellNav({ basePath }: { basePath: string }) {
  return (
    <nav
      aria-label="Project sections"
      className="sidebar-scroll -mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1"
    >
      {TAB_GROUPS.map((group, groupIndex) => (
        <div key={group} className="flex items-center gap-1">
          {groupIndex > 0 && <span aria-hidden="true" className="mx-1.5 h-5 w-px shrink-0 bg-[var(--border)]" />}
          {SHELL_TABS.filter((tab) => tab.group === group).map((tab) => (
            <NavLink
              key={tab.to}
              to={`${basePath}/${tab.to}`}
              className={({ isActive }) =>
                cn(
                  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[8px] px-2.5 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                  isActive
                    ? "bg-[var(--brand-bg)] text-[var(--brand)] ring-1 ring-inset ring-[var(--brand)]/25"
                    : "text-[var(--text3)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
                )
              }
            >
              <tab.icon className="size-3.5" aria-hidden="true" />
              {tab.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

// ── lifecycle menu ───────────────────────────────────────────

function LifecycleMenu({ project }: { project: Project }) {
  const { transition } = useProjectMutations(project.id);
  const busy = transition.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <UiButton variant="outline" size="icon-sm" aria-label="Project lifecycle actions" disabled={busy}>
          <MoreHorizontal className="size-4" />
        </UiButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {project.status === "active" && (
          <DropdownMenuItem onClick={() => transition.mutate({ id: project.id, action: "pause" })}>
            <Pause className="mr-2 size-4 text-[var(--amber)]" /> Pause ingestion
          </DropdownMenuItem>
        )}
        {project.status === "paused" && (
          <DropdownMenuItem onClick={() => transition.mutate({ id: project.id, action: "resume" })}>
            <Play className="mr-2 size-4 text-[var(--green)]" /> Resume ingestion
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {project.status === "archived" ? (
          <DropdownMenuItem onClick={() => transition.mutate({ id: project.id, action: "unarchive" })}>
            <RotateCcw className="mr-2 size-4" /> Unarchive project
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => transition.mutate({ id: project.id, action: "archive" })}>
            <Archive className="mr-2 size-4 text-[var(--red)]" /> Archive project
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => transition.mutate({ id: project.id, action: "restore" })}>
          <RotateCcw className="mr-2 size-4" /> Restore soft-deleted
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── shell ────────────────────────────────────────────────────

export function ProjectShellPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const safeProjectId = projectId ?? "";
  const { data: project, isLoading, error } = useProject(safeProjectId);

  if (!projectId) return <Navigate to="/projects" replace />;

  if (isLoading) {
    return (
      <div className="h-full w-full overflow-y-auto sidebar-scroll">
        <div className="px-6 py-6">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <IconChip icon={FolderOpen} tone="red" size="lg" />
        <h2 className="text-[17px] font-semibold text-[var(--text)]">Project not found</h2>
        <p className="max-w-[46ch] text-[13px] text-[var(--text2)]">
          This project does not exist, was deleted, or your account does not have access to it.
        </p>
        <Link
          to="/projects"
          className="mt-1 text-[13px] font-medium text-[var(--brand)] hover:underline"
        >
          Back to all projects
        </Link>
      </div>
    );
  }

  const basePath = `/projects/${project.id}`;

  return (
    <ProjectContext.Provider value={{ project, projectId: safeProjectId }}>
      <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--bg)]">
        {/* Sticky project chrome: identity + lifecycle + section nav */}
        <header className="shrink-0 border-b border-[var(--border)] bg-[var(--bg1)] px-6 pt-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <IconChip icon={FolderOpen} size="lg" tone="brand" className="mt-0.5" />
              <div className="min-w-0">
                <Breadcrumbs
                  items={[{ label: "Workspaces" }, { label: "Projects", to: "/projects" }, { label: project.name }]}
                />
                <div className="mt-1 flex flex-wrap items-center gap-2.5">
                  <h1 className="truncate font-[family-name:var(--display)] text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[var(--text)]">
                    {project.name}
                  </h1>
                  <Pill tone={PROJECT_STATUS_TONE[project.status]} dot>
                    {project.status}
                  </Pill>
                  <code className="rounded-[6px] bg-[var(--bg2)] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">
                    {project.slug}
                  </code>
                </div>
                {project.description && (
                  <p className="mt-1.5 max-w-[80ch] truncate text-[13px] text-[var(--text2)]">
                    {project.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden text-[11.5px] text-[var(--text3)] sm:inline">
                {project.visibility} · {project.timezone}
              </span>
              <LifecycleMenu project={project} />
            </div>
          </div>
          <div className="mt-4">
            <ShellNav basePath={basePath} />
          </div>
        </header>

        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </div>
      </div>
    </ProjectContext.Provider>
  );
}

export default ProjectShellPage;
