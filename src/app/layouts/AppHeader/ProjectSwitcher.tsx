import { FolderOpen, ChevronDown, Check, Plus, Layers } from 'lucide-react';
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
          className="flex items-center gap-1.5 px-1.5 sm:px-2.5 h-8 sm:h-9 text-[var(--text)] hover:bg-[var(--bg2)] focus-visible:ring-0 focus-visible:ring-offset-0 border border-[var(--border)] bg-[var(--bg2)]/50 rounded-[var(--radius)] shrink min-w-0"
          disabled={isLoading}
        >
          <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--brand)] shrink-0" />
          <span className="font-medium text-[12px] sm:text-[13px] truncate max-w-[65px] xs:max-w-[90px] sm:max-w-[120px] md:max-w-[140px] lg:max-w-[160px]">
            {activeProject ? activeProject.name : 'All Projects'}
          </span>
          <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[var(--text3)] shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel className="flex items-center justify-between text-[11px] font-mono uppercase text-[var(--text3)]">
          Projects
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* All Projects Option */}
        <DropdownMenuItem
          onClick={() => handleSelectProject(null, null)}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[var(--text3)]" />
            <span>All Projects</span>
          </div>
          {!activeProjectId && !activeProjectSlug ? (
            <Check className="h-4 w-4 text-[var(--brand)]" />
          ) : null}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="max-h-[240px] overflow-y-auto">
          {projects.map((proj) => {
            const isSelected = activeProjectId === proj.id || activeProjectSlug === proj.slug;
            return (
              <DropdownMenuItem
                key={proj.id}
                onClick={() => handleSelectProject(proj.id, proj.slug)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-[13px] font-medium">{proj.name}</span>
                  <span className="truncate font-mono text-[10px] text-[var(--text3)]">{proj.slug}</span>
                </div>
                {isSelected ? <Check className="h-4 w-4 text-[var(--brand)] shrink-0" /> : null}
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate(activeOrgSlug ? `/${activeOrgSlug}/projects/new` : '/projects/new')}
          className="cursor-pointer text-[var(--text2)] group"
        >
          <Plus className="h-4 w-4 mr-2 group-hover:text-[var(--brand)]" />
          New project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
