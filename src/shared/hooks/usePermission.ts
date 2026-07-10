import { useParams } from "react-router";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import { useProjectMembers } from "@/modules/projects/hooks/useProjects";

export type ProjectPermission = 
  | "project:read"
  | "project:write"
  | "project:delete"
  | "project.members:read"
  | "project.members:write"
  | "project.routes:read"
  | "project.routes:write"
  | "project.settings:read"
  | "project.settings:write";

const ROLE_PERMISSIONS: Record<string, ProjectPermission[]> = {
  owner: [
    "project:read", "project:write", "project:delete",
    "project.members:read", "project.members:write",
    "project.routes:read", "project.routes:write",
    "project.settings:read", "project.settings:write"
  ],
  admin: [
    "project:read", "project:write",
    "project.members:read", "project.members:write",
    "project.routes:read", "project.routes:write",
    "project.settings:read", "project.settings:write"
  ],
  member: [
    "project:read",
    "project.members:read",
    "project.routes:read",
    "project.settings:read"
  ]
};

export const usePermission = (projectId?: string) => {
  const params = useParams();
  const id = projectId || params.projectId;
  const user = useAuthStore((state) => state.user);
  
  // Try to get member data for current user
  const { data: members, isLoading } = useProjectMembers(id || "");
  
  const currentMember = members?.find((m: any) => m.userId === user?.id);
  const userRole = currentMember?.role || "member"; // Default fallback
  
  const hasPermission = (permission: ProjectPermission): boolean => {
    if (!id) return false;
    
    // Org owner has all permissions (simplified)
    if ((user as any)?.role === "owner") return true;
    
    const allowedPermissions = ROLE_PERMISSIONS[userRole] || [];
    return allowedPermissions.includes(permission);
  };
  
  return {
    hasPermission,
    role: userRole,
    isLoading
  };
};
