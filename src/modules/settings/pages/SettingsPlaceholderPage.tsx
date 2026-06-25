import { useLocation } from 'react-router';
import { Construction } from 'lucide-react';

export default function SettingsPlaceholderPage() {
  const location = useLocation();
  const pageName = location.pathname.split('/').pop()?.replace(/-/g, ' ') || 'Settings';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text)] capitalize">{pageName}</h1>
        <p className="text-sm text-[var(--text2)] mt-1">Configure your organization's {pageName} settings.</p>
      </div>

      <div className="bg-[var(--bg1)] border border-[var(--border)] rounded-[10px] p-8 flex flex-col items-center justify-center gap-4 min-h-[200px]">
        <div className="w-12 h-12 rounded-[10px] bg-[var(--brand-bg)] flex items-center justify-center">
          <Construction className="size-6 text-[var(--brand)]" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--text)]">Coming soon</p>
          <p className="text-xs text-[var(--text3)] mt-1 max-w-xs">
            This section is under development. Check back soon for updates.
          </p>
        </div>
      </div>
    </div>
  );
}
