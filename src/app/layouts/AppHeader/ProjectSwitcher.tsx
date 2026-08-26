import { FolderOpen, ChevronsUpDown, Check, Plus, Layers } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useOrgStore } from '@/modules/organizations/store/org.store';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { useNavigate } from 'react-router';

export function ProjectSwitcher() {
  const navigate = useNavigate();
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);
  const activeProjectId = useOrgStore((s) => s.activeProjectId);
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);
  const setActiveProjectId = useOrgStore((s) => s.setActiveProjectId);
  const setActiveProjectSlug = useOrgStore((s) => s.setActiveProjectSlug);

  const { data, isLoading } = useProjects({ limit: 100, sortBy: 'updated_at', sortOrder: 'desc' });
  const projects = data?.data ?? [];

  const activeProject = projects.find((p) => p.id === activeProjectId || p.slug === activeProjectSlug);

  const handleSelectProject = (projectId: string | null, projectSlug: string | null) => {
    setActiveProjectId(projectId);
    setActiveProjectSlug(projectSlug);
  };

  if (!activeOrgId) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="group flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 h-8 sm:h-9 text-[var(--text)] hover:bg-[var(--bg2)] hover:border-[var(--border2)] border border-[var(--border)] bg-[var(--bg2)]/50 rounded-[var(--radius)] text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)] shrink min-w-0"
          disabled={isLoading}
        >
          <div className="flex size-5 items-center justify-center rounded-[4px] bg-[var(--brand-bg)] text-[var(--brand)] ring-1 ring-inset ring-[var(--brand)]/20 shrink-0">
            <FolderOpen className="size-3" />
          </div>
          <span className="font-medium text-[12px] sm:text-[13px] truncate max-w-[70px] xs:max-w-[100px] sm:max-w-[130px] md:max-w-[150px] lg:max-w-[180px]">
            {activeProject ? activeProject.name : 'All Projects'}
          </span>
          <ChevronsUpDown className="size-3.5 text-[var(--text3)] group-hover:text-[var(--text2)] shrink-0 transition-colors" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[260px] p-1">
        <DropdownMenuLabel className="px-2 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">
          Projects
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[var(--border)] -mx-1 my-1" />
        
        {/* All Projects Option */}
        <DropdownMenuItem
          onClick={() => handleSelectProject(null, null)}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-sm)] cursor-pointer text-[13px] hover:bg-[var(--bg2)] text-[var(--text)] focus:bg-[var(--bg2)] focus:text-[var(--text)] transition-colors"
        >
          <div className="flex size-5 items-center justify-center rounded-[4px] bg-[var(--bg3)] text-[var(--text2)] shrink-0">
            <Layers className="size-3" />
          </div>
          <span className="flex-1 truncate text-[13px] font-medium">All Projects</span>
          {!activeProjectId && !activeProjectSlug ? (
            <Check className="size-3.5 text-[var(--brand)] shrink-0 ml-auto" />
          ) : null}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-[var(--border)] -mx-1 my-1" />

        <div className="max-h-[260px] overflow-y-auto space-y-0.5">
          {projects.map((proj) => {
            const isSelected = activeProjectId === proj.id || activeProjectSlug === proj.slug;
            return (
              <DropdownMenuItem
                key={proj.id}
                onClick={() => handleSelectProject(proj.id, proj.slug)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-sm)] cursor-pointer text-[13px] hover:bg-[var(--bg2)] text-[var(--text)] focus:bg-[var(--bg2)] focus:text-[var(--text)] transition-colors"
              >
                <div className="flex size-5 items-center justify-center rounded-[4px] bg-[var(--bg3)] text-[var(--text2)] shrink-0">
                  <FolderOpen className="size-3" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate text-[13px] font-medium leading-tight text-[var(--text)]">{proj.name}</span>
                  <span className="truncate font-mono text-[10px] text-[var(--text3)] leading-tight">{proj.slug}</span>
                </div>
                {isSelected ? <Check className="size-3.5 text-[var(--brand)] shrink-0 ml-auto" /> : null}
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator className="bg-[var(--border)] -mx-1 my-1" />
        <DropdownMenuItem
          onClick={() => navigate(activeOrgSlug ? `/${activeOrgSlug}/projects/new` : '/projects/new')}
          className="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] cursor-pointer text-[12px] sm:text-[13px] font-medium text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)] group transition-colors"
        >
          <Plus className="size-3.5 text-[var(--text3)] group-hover:text-[var(--brand)] shrink-0 transition-colors" />
          <span>New project</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

