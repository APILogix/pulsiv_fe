import { useLocation } from 'react-router';
import { Construction } from 'lucide-react';

export default function AppPlaceholderPage() {
  const location = useLocation();
  const pageName = location.pathname.split('/').pop()?.replace(/-/g, ' ') || 'Page';

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)] capitalize">{pageName}</h1>
        <p className="text-sm text-[var(--text2)] mt-1">This section is currently under development.</p>
      </div>

      <div className="flex-1 bg-[var(--bg1)] border border-[var(--border)] rounded-[10px] p-8 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-[10px] bg-[var(--brand-bg)] flex items-center justify-center">
          <Construction className="size-8 text-[var(--brand)]" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-[var(--text)]">Coming soon</p>
          <p className="text-sm text-[var(--text3)] mt-2 max-w-md">
            We're working hard to bring you the new {pageName} experience. Check back soon for updates.
          </p>
        </div>
      </div>
    </div>
  );
}
