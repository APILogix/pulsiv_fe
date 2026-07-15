import { DashboardInitAnimation } from './animations/DashboardInitAnimation';

export function LoadingScreen({ message = "Initializing dashboard..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg)]">
      <div className="flex flex-col items-center gap-10 animate-in fade-in duration-700">
        <DashboardInitAnimation />
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 text-sm text-[var(--text2)] font-mono tracking-widest uppercase">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--brand)] pulse-dot" />
            {message}
          </div>
          <p className="text-[12px] text-[var(--text3)]">Gathering and syncing charts data</p>
        </div>
      </div>
    </div>
  );
}
