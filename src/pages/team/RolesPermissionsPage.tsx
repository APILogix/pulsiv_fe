import { useState } from "react";
import { KeyRound, Lock, Plus, Shield, ShieldCheck, SlidersHorizontal } from "lucide-react";

import { Button, SearchInput } from "@/shared/observe";
import {
  EmptyPanel,
  HeroFacts,
  Notice,
  PageHero,
  Panel,
  Pill,
  SectionHeading,
  Toolbar,
  type HeroFact,
} from "@/shared/ui/pulse";
import { cn } from "@/lib/utils";

interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  system?: boolean;
}

interface PermissionDefinition {
  id: string;
  name: string;
  description: string;
}

interface PermissionGroup {
  category: string;
  permissions: PermissionDefinition[];
}

const ROLES: RoleDefinition[] = [
  { id: "admin", name: "Admin", description: "Full access to all settings and data.", system: true },
  { id: "editor", name: "Editor", description: "Can edit content and view reports." },
  { id: "viewer", name: "Viewer", description: "Read-only access to most modules." },
  { id: "billing", name: "Billing Manager", description: "Can manage subscriptions and invoices." },
];

const PERMISSIONS_MATRIX: PermissionGroup[] = [
  {
    category: "Billing",
    permissions: [
      { id: "billing:read", name: "View billing", description: "Can view invoices and plan details" },
      { id: "billing:write", name: "Manage billing", description: "Can change plans and payment methods" },
    ],
  },
  {
    category: "Users",
    permissions: [
      { id: "users:read", name: "View users", description: "Can see team members and roles" },
      { id: "users:write", name: "Manage users", description: "Can invite, remove, and change roles" },
    ],
  },
  {
    category: "Projects",
    permissions: [
      { id: "projects:read", name: "View projects", description: "Can access project resources" },
      { id: "projects:write", name: "Manage projects", description: "Can create and delete projects" },
    ],
  },
];

const PERMISSION_COUNT = PERMISSIONS_MATRIX.reduce((total, group) => total + group.permissions.length, 0);

// ── one-off local component: role selector card in the left rail ──
function RoleCard({
  role,
  selected,
  onSelect,
}: {
  role: RoleDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex flex-col items-start gap-1.5 rounded-[12px] border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        selected
          ? "border-[var(--brand)] bg-[var(--brand-bg)]"
          : "border-[var(--border)] bg-[var(--bg1)] hover:border-[var(--border2)]"
      )}
    >
      <span className="flex w-full items-center gap-2">
        <Shield
          className={cn("size-4 shrink-0", selected ? "text-[var(--brand)]" : "text-[var(--text3)]")}
          aria-hidden="true"
        />
        <span
          className={cn(
            "truncate text-[13.5px] font-semibold",
            selected ? "text-[var(--brand)]" : "text-[var(--text)]"
          )}
        >
          {role.name}
        </span>
        {role.system && (
          <span className="ml-auto shrink-0">
            <Pill tone="neutral">System</Pill>
          </span>
        )}
      </span>
      <span className="line-clamp-2 text-[12px] leading-relaxed text-[var(--text2)]">{role.description}</span>
    </button>
  );
}

// ── one-off local component: single permission tile in the matrix ──
function PermissionTile({
  permission,
  locked,
  defaultGranted,
}: {
  permission: PermissionDefinition;
  locked: boolean;
  defaultGranted: boolean;
}) {
  const inputId = `perm-${permission.id}`;
  return (
    <div className="flex items-start gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-4 transition-colors hover:border-[var(--border2)]">
      <input
        id={inputId}
        type="checkbox"
        defaultChecked={defaultGranted}
        disabled={locked}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
      />
      <div className="flex min-w-0 flex-col">
        <label htmlFor={inputId} className="flex items-center gap-2 text-[13.5px] font-medium text-[var(--text)]">
          {permission.name}
          {locked && <Lock className="size-3 text-[var(--text3)]" aria-hidden="true" />}
        </label>
        <span className="mt-0.5 text-[12px] leading-relaxed text-[var(--text2)]">{permission.description}</span>
        <span className="mt-1.5 font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">{permission.id}</span>
      </div>
    </div>
  );
}

export default function RolesPermissionsPage() {
  const [activeRole, setActiveRole] = useState("admin");
  const [search, setSearch] = useState("");

  const term = search.trim().toLowerCase();
  const visibleRoles = ROLES.filter(
    (role) => term.length === 0 || role.name.toLowerCase().includes(term) || role.id.includes(term)
  );

  const selectedRole = ROLES.find((role) => role.id === activeRole) ?? ROLES[0];
  const isSystemRole = !!selectedRole.system;

  const facts: HeroFact[] = [
    { label: "Roles defined", value: ROLES.length, icon: Shield },
    { label: "Permissions tracked", value: PERMISSION_COUNT, tone: "ai", icon: KeyRound },
    { label: "Permission groups", value: PERMISSIONS_MATRIX.length, tone: "blue", icon: SlidersHorizontal },
    {
      label: "System roles",
      value: ROLES.filter((role) => role.system).length,
      tone: "violet",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Access control"
        title="Roles and permissions"
        description="Review the access each role grants, and adjust granular permissions for custom roles."
        icon={Shield}
        actions={
          <Button variant="primary">
            <Plus className="size-4" aria-hidden="true" />
            Create custom role
          </Button>
        }
      >
        <HeroFacts facts={facts} />
      </PageHero>

      {isSystemRole && (
        <Notice tone="blue" icon={Lock} title="System role">
          {`${selectedRole.name} is managed by Sentinel and always holds every permission. Create a custom role to grant a narrower scope.`}
        </Notice>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Toolbar>
            <SearchInput placeholder="Search roles…" defaultValue={search} onSearch={setSearch} />
          </Toolbar>

          {visibleRoles.length === 0 ? (
            <EmptyPanel
              icon={Shield}
              title="No roles match"
              description="Clear the search to see every role defined for this organization."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {visibleRoles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  selected={role.id === activeRole}
                  onSelect={() => setActiveRole(role.id)}
                />
              ))}
            </div>
          )}
        </div>

        <Panel
          title={`Permissions for ${selectedRole.name}`}
          description={selectedRole.description}
          icon={KeyRound}
          tone="brand"
          actions={
            isSystemRole ? <Pill tone="neutral">Read only</Pill> : <Pill tone="brand" dot>Editable</Pill>
          }
        >
          <div className="flex flex-col gap-8">
            {PERMISSIONS_MATRIX.map((group) => (
              <div key={group.category} className="flex flex-col gap-4">
                <SectionHeading title={group.category} />
                <div className="grid gap-3 xl:grid-cols-2">
                  {group.permissions.map((permission) => (
                    <PermissionTile
                      key={`${selectedRole.id}-${permission.id}`}
                      permission={permission}
                      locked={isSystemRole}
                      defaultGranted={isSystemRole}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
