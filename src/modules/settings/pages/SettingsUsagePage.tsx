export default function SettingsUsagePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text)]">Usage</h1>
        <p className="text-sm text-[var(--text2)] mt-1">Monitor your API usage, rate limits, and quota consumption.</p>
      </div>

      <div className="bg-[var(--bg1)] border border-[var(--border)] rounded-[10px] p-6">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Current period</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-[family-name:var(--mono)] text-[var(--text3)]">API calls</span>
            <p className="text-2xl font-[family-name:var(--mono)] font-medium text-[var(--text)] mt-1">0</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-[family-name:var(--mono)] text-[var(--text3)]">Rate limit</span>
            <p className="text-2xl font-[family-name:var(--mono)] font-medium text-[var(--text)] mt-1">1,000</p>
          </div>
        </div>
      </div>
    </div>
  );
}
