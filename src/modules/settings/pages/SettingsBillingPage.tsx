export default function SettingsBillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text)]">Billing</h1>
        <p className="text-sm text-[var(--text2)] mt-1">Manage your subscription, payment methods, and invoices.</p>
      </div>

      <div className="bg-[var(--bg1)] border border-[var(--border)] rounded-[10px] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">Current plan</h3>
            <p className="text-xs text-[var(--text2)] mt-1">You are currently on the free tier.</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[var(--green-bg)] text-[var(--green)] font-[family-name:var(--mono)] text-[10px] font-medium uppercase">
            Active
          </span>
        </div>
      </div>
    </div>
  );
}
