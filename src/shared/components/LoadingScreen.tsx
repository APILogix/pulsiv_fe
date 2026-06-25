import { PulsivWordmark } from './PulsivLogo';

export function LoadingScreen({ message = "Initializing..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-8 animate-in fade-in duration-700">
        <PulsivWordmark size={64} />
        <div className="flex items-center gap-3 text-sm text-[#999999] font-mono tracking-widest uppercase">
          <span className="inline-block h-2 w-2 rounded-full bg-[#34d399] pulse-dot" />
          {message}
        </div>
      </div>
    </div>
  );
}
