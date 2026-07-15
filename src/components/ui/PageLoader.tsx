export function PageLoader() {
  return (
    <div className="flex h-full w-full flex-col gap-6 p-6">
      <div className="h-10 w-1/3 animate-pulse rounded-md bg-[var(--bg2)]" />
      <div className="h-4 w-1/4 animate-pulse rounded-md bg-[var(--bg2)]" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mt-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[10px] bg-[var(--bg1)] border border-[var(--border)]" />
        ))}
      </div>
      <div className="mt-4 flex-1 animate-pulse rounded-[10px] bg-[var(--bg1)] border border-[var(--border)]" />
    </div>
  );
}
