export default function SettingsGeneralPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text)]">General</h1>
        <p className="text-sm text-[var(--text2)] mt-1">Manage your organization settings and preferences.</p>
      </div>

      <div className="bg-[var(--bg1)] border border-[var(--border)] rounded-[10px] p-6">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Organization</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-[family-name:var(--mono)] uppercase tracking-wider text-[var(--text3)] block mb-1.5">Name</label>
            <div className="h-9 px-3 rounded-[6px] bg-[var(--bg2)] border border-[var(--border)] text-sm text-[var(--text)] flex items-center">
              My Organization
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
