import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Plus } from "lucide-react";

import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { newProjectPath, projectPath } from "@/modules/projects/navigation/project-routes";
import { useProjects } from "@/modules/projects/hooks/useProjects";
import type { ListProjectsQuery, ProjectListItem, ProjectStatus } from "@/modules/projects/api/types";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  ProjectPageHeader,
  Readouts,
  RowTitle,
  SearchField,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  ToolbarCount,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Pill, SegmentedControl, type SegmentOption } from "@/shared/ui/pulse";
import { FilterSelect, Timestamp, formatCompact, formatNumber } from "@/shared/observe";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { Button as UiButton } from "@/components/ui/button";
import { PROJECT_STATUS_TONE } from "./ProjectShellPage";

// ── module-level constants (rules.md §1.2) ───────────────────

type StatusFilter = "all" | ProjectStatus;
type SortKey = NonNullable<ListProjectsQuery["sortBy"]>;

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "created_at", label: "Newest" },
  { value: "updated_at", label: "Recently updated" },
  { value: "name", label: "Name" },
];

// Same key as the header project switcher, so the summary is usually cached.
const SUMMARY_QUERY: ListProjectsQuery = { limit: 100, sortBy: "updated_at", sortOrder: "desc" };

const COLUMNS: SheetColumn[] = [
  { key: "project", header: "Project" },
  { key: "status", header: "Status", className: "w-[112px]" },
  // Last visible column below md (Created is hidden there), so it takes the edge padding.
  { key: "keys", header: "Ingestion keys", className: "w-[148px] max-md:pr-5" },
  { key: "timezone", header: "Timezone", className: `w-[180px] ${HIDE_BELOW_LG}` },
  { key: "created", header: "Created", className: `w-[120px] ${HIDE_BELOW_MD}` },
];

function statusCounts(projects: ProjectListItem[]) {
  const counts: Record<ProjectStatus, number> = { active: 0, paused: 0, archived: 0 };
  for (const project of projects) counts[project.status] += 1;
  return counts;
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { orgSlug: paramOrgSlug } = useParams<{ orgSlug: string }>();
  const storeOrgSlug = useOrgStore((state) => state.activeOrgSlug);
  const activeOrgSlug = paramOrgSlug || storeOrgSlug;
  const { organizations } = useOrganizations();

  const setActiveOrgId = useOrgStore((s) => s.setActiveOrgId);
  const setActiveOrgSlug = useOrgStore((s) => s.setActiveOrgSlug);

  useEffect(() => {
    if (paramOrgSlug && organizations.length > 0) {
      const matchingOrg = organizations.find((o) => o.slug === paramOrgSlug);
      if (matchingOrg && (useOrgStore.getState().activeOrgId !== matchingOrg.id || useOrgStore.getState().activeOrgSlug !== matchingOrg.slug)) {
        setActiveOrgId(matchingOrg.id);
        setActiveOrgSlug(matchingOrg.slug);
      }
    }
  }, [paramOrgSlug, organizations, setActiveOrgId, setActiveOrgSlug]);

  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput.trim(), 250);

  const query: ListProjectsQuery = {
    ...(status !== "all" ? { status } : {}),
    ...(search ? { search } : {}),
    sortBy,
    sortOrder: sortBy === "name" ? "asc" : "desc",
    limit: 100,
  };

  const { data, isLoading, error, refetch } = useProjects(query);
  const projects = data?.data ?? [];

  // Readings describe the whole organization, never the current filter.
  const { data: summary, isLoading: summaryLoading } = useProjects(SUMMARY_QUERY);
  const everyProject = summary?.data ?? [];
  const counts = statusCounts(everyProject);
  const totalProjects = summary?.total ?? everyProject.length;
  const issuedKeys = everyProject.reduce((sum, project) => sum + project.apiKeysCount, 0);
  const activeKeys = everyProject.reduce((sum, project) => sum + project.activeApiKeysCount, 0);

  const createPath = activeOrgSlug ? newProjectPath(activeOrgSlug) : "/projects/new";
  const openPath = (project: ProjectListItem) =>
    activeOrgSlug ? projectPath(activeOrgSlug, project.publicId, "overview") : `/projects/${project.id}/overview`;

  const filtered = Boolean(search) || status !== "all";
  const clearFilters = () => {
    setSearchInput("");
    setStatus("all");
  };

  const readouts: Readout[] = [
    { label: "Projects", value: formatNumber(totalProjects), sub: "In this organization" },
    { label: "Active", value: formatNumber(counts.active), sub: "Accepting telemetry" },
    {
      label: "Paused",
      value: formatNumber(counts.paused),
      sub: counts.paused > 0 ? "Ingestion stopped" : "None paused",
      tone: counts.paused > 0 ? "warn" : "neutral",
    },
    { label: "Archived", value: formatNumber(counts.archived), sub: "Data kept until retention ends" },
    { label: "Active keys", value: formatCompact(activeKeys), sub: `of ${formatNumber(issuedKeys)} issued` },
  ];

  const statusOptions: SegmentOption<StatusFilter>[] = [
    { value: "all", label: "All", count: totalProjects },
    { value: "active", label: "Active", count: counts.active },
    { value: "paused", label: "Paused", count: counts.paused },
    { value: "archived", label: "Archived", count: counts.archived },
  ];

  let body;
  if (isLoading) {
    body = <SheetLoading rows={5} label="Loading projects" />;
  } else if (error) {
    body = <SheetError title="Could not load projects" message={apiErrorMessage(error)} onRetry={() => void refetch()} />;
  } else if (projects.length === 0) {
    body = filtered ? (
      <SheetEmpty
        title="No projects match"
        description={search ? `Nothing in this organization matches “${search}” with the current status filter.` : "No project has this status yet."}
        action={
          <UiButton variant="outline" size="lg" onClick={clearFilters}>
            Clear filters
          </UiButton>
        }
      />
    ) : (
      <SheetEmpty
        title="Create your first project"
        description="A project holds one application's environments, ingestion keys, members, and alert routing. Creating one also sets up a Production environment and its first ingestion key."
        action={
          <UiButton size="lg" onClick={() => navigate(createPath)}>
            <Plus className="size-4" aria-hidden="true" /> New project
          </UiButton>
        }
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Projects" minWidth={560}>
        {projects.map((project) => (
          <SheetRow
            key={project.id}
            muted={project.status === "archived"}
            onActivate={() => navigate(openPath(project))}
          >
            <SheetCell>
              <RowTitle
                title={project.name}
                to={openPath(project)}
                badges={
                  <code className="hidden shrink-0 font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)] sm:inline">
                    {project.slug}
                  </code>
                }
                subtitle={project.description || "No description"}
              />
            </SheetCell>
            <SheetCell>
              <Pill tone={PROJECT_STATUS_TONE[project.status]} dot>
                {project.status}
              </Pill>
            </SheetCell>
            <SheetCell className="whitespace-nowrap max-md:pr-5">
              <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text)]">
                {formatNumber(project.activeApiKeysCount)}
              </span>
              <span className="text-[12px] text-[var(--text3)]"> active of </span>
              <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                {formatNumber(project.apiKeysCount)}
              </span>
            </SheetCell>
            <SheetCell className={HIDE_BELOW_LG}>
              <span className="block truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]" title={project.timezone}>
                {project.timezone}
              </span>
            </SheetCell>
            <SheetCell className={HIDE_BELOW_MD}>
              <Timestamp value={project.createdAt} />
            </SheetCell>
          </SheetRow>
        ))}
      </SheetTable>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Projects"
        description="Each project holds one application's environments, ingestion keys, members, and alert routing. Open one to manage it."
        actions={
          <UiButton size="lg" onClick={() => navigate(createPath)}>
            <Plus className="size-4" aria-hidden="true" /> New project
          </UiButton>
        }
      />

      <Readouts cells={readouts} loading={summaryLoading} label="Projects summary" />

      <Sheet
        label="Project list"
        toolbar={
          <>
            <SearchField
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search projects by name"
              label="Search projects"
            />
            <SegmentedControl value={status} onChange={setStatus} options={statusOptions} ariaLabel="Filter projects by status" />
            <FilterSelect
              label="Sort"
              value={sortBy}
              onChange={(value) => setSortBy(value as SortKey)}
              options={SORT_OPTIONS}
            />
            {!isLoading && !error && (
              <ToolbarCount>
                {formatNumber(projects.length)} {projects.length === 1 ? "project" : "projects"}
              </ToolbarCount>
            )}
          </>
        }
        footer={
          counts.archived > 0 ? (
            <span>
              Archived projects stop ingesting and keep their data until retention expires. To bring one back, open it and
              choose Unarchive from the project actions menu.
            </span>
          ) : undefined
        }
      >
        {body}
      </Sheet>
    </WorkspacePage>
  );
}
