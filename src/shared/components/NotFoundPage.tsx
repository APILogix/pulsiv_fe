import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { ParticleField } from './ParticleField';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen w-full bg-[var(--bg)] flex flex-col items-center justify-center p-8 relative overflow-hidden font-[family-name:var(--sans)]">
      <div className="absolute inset-0 z-0">
        <ParticleField />
      </div>
      {/* Animated radar sweep background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-[500px] h-[500px]">
          {/* Concentric rings */}
          <div className="absolute inset-0 rounded-full border border-[var(--border)] opacity-20 animate-[pulse-ring_3s_ease-out_infinite]" />
          <div className="absolute inset-[60px] rounded-full border border-[var(--border)] opacity-25 animate-[pulse-ring_3s_ease-out_0.5s_infinite]" />
          <div className="absolute inset-[120px] rounded-full border border-[var(--border)] opacity-30 animate-[pulse-ring_3s_ease-out_1s_infinite]" />
          <div className="absolute inset-[180px] rounded-full border border-[var(--brand)] opacity-10 animate-[pulse-ring_3s_ease-out_1.5s_infinite]" />
          
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[var(--brand)] pulse-dot z-20" />
          
          {/* Radar sweep using conic gradient */}
          <div className="absolute inset-0 rounded-full animate-[radar-spin_4s_linear_infinite]"
               style={{ background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, var(--brand) 360deg)', opacity: 0.15 }} />

          {/* Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full bg-[var(--brand)] opacity-[0.03] blur-[60px]" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* 404 number */}
        <div className="relative mb-6">
          <span className="text-[120px] font-bold leading-none tracking-tighter text-[var(--bg2)] font-[family-name:var(--mono)] select-none">
            404
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-[120px] font-bold leading-none tracking-tighter text-transparent bg-clip-text font-[family-name:var(--mono)] select-none animate-[glitch-text_2s_ease-in-out_infinite]"
            style={{ backgroundImage: 'linear-gradient(135deg, var(--brand) 0%, var(--green-d) 100%)' }}
          >
            404
          </span>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-[var(--amber)] animate-pulse" />
          <span className="font-[family-name:var(--mono)] text-xs uppercase tracking-wider text-[var(--amber)]">
            Signal lost
          </span>
        </div>

        <h1 className="text-xl font-semibold text-[var(--text)] mb-2">
          Route not found
        </h1>
        <p className="text-sm text-[var(--text2)] leading-relaxed mb-8">
          The requested endpoint does not exist or has been deprecated. 
          Verify the URL path and try again.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--brand)] text-[var(--brand-fg)] rounded-[6px] text-sm font-semibold hover:bg-[var(--brand-d)] transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        </div>

        {/* Meta info */}
        <div className="mt-12 flex items-center gap-3 text-[var(--text3)]">
          <span className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-wider">
            Pulse monitoring
          </span>
          <span className="w-1 h-1 rounded-full bg-[var(--text3)]" />
          <span className="font-[family-name:var(--mono)] text-[10px]">
            {new Date().toISOString().slice(0, 19)}Z
          </span>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes radar-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0%   { opacity: 0.3; transform: scale(0.95); }
          50%  { opacity: 0.1; transform: scale(1.02); }
          100% { opacity: 0.3; transform: scale(0.95); }
        }
        @keyframes glitch-text {
          0%, 100% { opacity: 1; transform: translate(0); }
          20%  { opacity: 0.8; transform: translate(-2px, 1px); }
          40%  { opacity: 1; transform: translate(0); }
          60%  { opacity: 0.9; transform: translate(1px, -1px); }
          80%  { opacity: 1; transform: translate(0); }
        }
      `}</style>
    </div>
  );
}
