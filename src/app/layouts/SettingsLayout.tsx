import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import {
  Settings,
  CreditCard,
  BarChart3,
  Shield,
  Users,
  ArrowLeft,
  KeyRound,
  Bell,
  Globe,
  Webhook,
  Database,
  ScrollText,
  UserCog,
} from 'lucide-react';

const generalTabs = [
  { label: 'General', path: '/settings', icon: Settings, exact: true },
  { label: 'Billing', path: '/settings/billing', icon: CreditCard },
  { label: 'Usage & limits', path: '/settings/usage', icon: BarChart3 },
];

const configTabs = [
  { label: 'API keys', path: '/settings/api-keys', icon: KeyRound },
  { label: 'Webhooks', path: '/settings/webhooks', icon: Webhook },
  { label: 'Integrations', path: '/settings/integrations', icon: Globe },
  { label: 'Data retention', path: '/settings/data-retention', icon: Database },
  { label: 'Alert rules', path: '/settings/alert-rules', icon: Bell },
  { label: 'Audit log', path: '/settings/audit-log', icon: ScrollText },
];

const adminTabs = [
  { label: 'Members', path: '/settings/members', icon: Users },
  { label: 'SSO & security', path: '/settings/security', icon: Shield },
  { label: 'SCIM provisioning', path: '/settings/scim', icon: UserCog },
];

export default function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const renderTab = (tab: { label: string; path: string; icon: React.ElementType; exact?: boolean }) => {
    const Icon = tab.icon;
    const active = isActive(tab.path, tab.exact);
    return (
      <Link
        key={tab.path}
        to={tab.path}
        className={`flex items-center gap-3 px-3 py-2 rounded-[6px] text-sm font-medium transition-colors ${
          active
            ? 'bg-[var(--brand-bg)] text-[var(--brand)]'
            : 'text-[var(--text2)] hover:bg-[var(--brand-bg)] hover:text-[var(--brand)]'
        }`}
      >
        <Icon className="size-4 shrink-0" />
        {tab.label}
      </Link>
    );
  };

  return (
    <div className="flex h-full w-full">
      {/* Settings sidebar */}
      <nav className="w-[220px] shrink-0 border-r border-[var(--border)] bg-[var(--bg)] flex flex-col py-6 px-3 gap-5 overflow-y-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--text2)] hover:text-[var(--brand)] transition-colors text-sm font-medium px-2 outline-hidden"
        >
          <ArrowLeft className="size-4" />
          <span>Close settings</span>
        </button>

        {/* Title */}
        <div className="px-2">
          <h2 className="text-base font-semibold text-[var(--text)]">Settings</h2>
          <p className="text-xs text-[var(--text3)] mt-1 font-[family-name:var(--mono)]">Organization settings</p>
        </div>

        {/* General */}
        <div className="flex flex-col gap-1">
          <span className="px-2 text-[10px] uppercase tracking-[0.08em] font-[family-name:var(--mono)] font-medium text-[var(--text3)] mb-1">
            General
          </span>
          {generalTabs.map(renderTab)}
        </div>

        {/* Configuration */}
        <div className="flex flex-col gap-1">
          <span className="px-2 text-[10px] uppercase tracking-[0.08em] font-[family-name:var(--mono)] font-medium text-[var(--text3)] mb-1">
            Configuration
          </span>
          {configTabs.map(renderTab)}
        </div>

        {/* Admin */}
        {isAdmin && (
          <div className="flex flex-col gap-1">
            <span className="px-2 text-[10px] uppercase tracking-[0.08em] font-[family-name:var(--mono)] font-medium text-[var(--text3)] mb-1">
              Admin
            </span>
            {adminTabs.map(renderTab)}
          </div>
        )}
      </nav>

      {/* Settings content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[760px] px-8 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
