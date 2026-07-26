import { useState } from "react";
import { Search, Shield, Plus, Lock } from "lucide-react";
import { PageHeader, SectionCard, Button, inputClass } from "@/shared/observe";

const ROLES = [
  { id: "admin", name: "Admin", description: "Full access to all settings and data." },
  { id: "editor", name: "Editor", description: "Can edit content and view reports." },
  { id: "viewer", name: "Viewer", description: "Read-only access to most modules." },
  { id: "billing", name: "Billing Manager", description: "Can manage subscriptions and invoices." },
];

const PERMISSIONS_MATRIX = [
  {
    category: "Billing",
    permissions: [
      { id: "billing:read", name: "View Billing", description: "Can view invoices and plan details" },
      { id: "billing:write", name: "Manage Billing", description: "Can change plans and payment methods" },
    ]
  },
  {
    category: "Users",
    permissions: [
      { id: "users:read", name: "View Users", description: "Can see team members and roles" },
      { id: "users:write", name: "Manage Users", description: "Can invite, remove, and change roles" },
    ]
  },
  {
    category: "Projects",
    permissions: [
      { id: "projects:read", name: "View Projects", description: "Can access project resources" },
      { id: "projects:write", name: "Manage Projects", description: "Can create and delete projects" },
    ]
  }
];

export default function RolesPermissionsPage() {
  const [activeRole, setActiveRole] = useState("admin");

  return (
    <div className="mx-auto max-w-[1400px] w-full flex flex-col gap-10 pb-20">
      <PageHeader 
        title="Roles & Permissions" 
        description="Configure access control and granular permissions for your team members." 
        actions={
          <Button variant="primary" className="h-10 px-5">
            <Plus className="mr-2 size-4" /> Create Custom Role
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
        <div className="space-y-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text3)]" />
            <input type="text" placeholder="Search roles..." className={`${inputClass} pl-10`} />
          </div>
          
          <div className="flex flex-col gap-2">
            {ROLES.map(role => (
              <button
                key={role.id}
                onClick={() => setActiveRole(role.id)}
                className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors ${
                  activeRole === role.id 
                    ? "border-[var(--brand)] bg-[var(--brand)]/10" 
                    : "border-[var(--border)] bg-[var(--bg1)] hover:border-[var(--border-hover)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className={`size-4 ${activeRole === role.id ? 'text-[var(--brand)]' : 'text-[var(--text2)]'}`} />
                  <span className={`font-semibold text-[14px] ${activeRole === role.id ? 'text-[var(--brand)]' : 'text-[var(--text)]'}`}>{role.name}</span>
                </div>
                <span className="text-[12px] text-[var(--text2)] line-clamp-1">{role.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionCard title={`Permissions for "${ROLES.find(r => r.id === activeRole)?.name}"`}>
            <div className="space-y-8">
              {PERMISSIONS_MATRIX.map(group => (
                <div key={group.category}>
                  <h4 className="text-[14px] font-semibold text-[var(--text)] mb-4">{group.category}</h4>
                  <div className="grid gap-3">
                    {group.permissions.map(perm => (
                      <label 
                        key={perm.id} 
                        className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] p-4 transition-all hover:border-[var(--border-hover)]"
                      >
                        <div className="mt-0.5">
                          <input 
                            type="checkbox" 
                            className="size-4 accent-[var(--brand)] cursor-pointer" 
                            defaultChecked={activeRole === "admin"}
                            disabled={activeRole === "admin"}
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[14px] font-medium text-[var(--text)] flex items-center gap-2">
                            {perm.name}
                            {activeRole === "admin" && <Lock className="size-3 text-[var(--text3)]" aria-label="System role - cannot be changed" />}
                          </span>
                          <span className="text-[12px] text-[var(--text2)] mt-0.5">{perm.description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
