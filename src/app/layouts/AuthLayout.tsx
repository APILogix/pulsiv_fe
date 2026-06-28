import React from "react";
import { Outlet } from "react-router";
import { PulsivWordmark } from "@/shared/components/PulsivLogo";

export function AuthLayout() {
  return (
    <div className="flex h-[100dvh] w-full bg-[#0c0c0c] text-white font-sans antialiased overflow-hidden">
      {/* LEFT PANEL */}
      <div className="flex-1 flex flex-col p-6 sm:p-10 w-full lg:max-w-[600px] lg:min-w-[500px] bg-[#0c0c0c] z-10 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Brand Header */}
        <div className="flex items-center justify-center lg:justify-start gap-3 mt-8 mb-8 lg:mt-0 lg:mb-auto">
          <PulsivWordmark size={32} />
        </div>

        {/* Form Container (Outlet) */}
        <div className="w-full max-w-[380px] mx-auto mb-auto lg:mt-10">
          <React.Suspense fallback={<AuthSkeleton />}>
            <Outlet />
          </React.Suspense>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="hidden lg:flex flex-[1.2] bg-[#080808] relative overflow-hidden items-center justify-center border-l border-[#1f1f1f]">
        {/* Abstract Grid Background */}
        <div 
          className="absolute inset-0 z-[1]"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Glowing Orbs */}
        <div 
          className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 z-[2]"
          style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)' }}
        />
        <div 
          className="absolute top-[20%] right-[10%] w-[400px] h-[400px] z-[2]"
          style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)' }}
        />

        {/* Floating Preview Card */}
        <div className="relative z-[3] w-[480px] bg-[#141414]/60 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-[0_24px_48px_rgba(0,0,0,0.5)] translate-y-5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2.5 h-2.5 bg-[#10b981] rounded-full shadow-[0_0_10px_#10b981]" />
            <div className="text-[13px] font-semibold text-white font-mono tracking-[0.05em]">SYSTEM_HEALTH_OK</div>
          </div>

          <div className="flex justify-between text-[11px] text-[#8A8F98] mb-2">
            <span>API Latency (p99)</span>
            <span className="text-[#10b981] font-mono">42ms</span>
          </div>
          <div className="h-1 bg-[#1f1f1f] rounded-sm mb-4 overflow-hidden">
            <div className="h-full bg-[#10b981] rounded-sm w-[15%]" />
          </div>

          <div className="flex justify-between text-[11px] text-[#8A8F98] mb-2 mt-4">
            <span>Event Ingestion Volume</span>
            <span className="text-white font-mono">1.2M/s</span>
          </div>
          <div className="h-1 bg-[#1f1f1f] rounded-sm mb-4 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-sm w-[78%]" />
          </div>

          <div className="flex justify-between text-[11px] text-[#8A8F98] mb-2 mt-4">
            <span>Error Rate</span>
            <span className="text-[#10b981] font-mono">0.001%</span>
          </div>
          <div className="h-1 bg-[#1f1f1f] rounded-sm mb-4 overflow-hidden">
            <div className="h-full bg-[#10b981] rounded-sm w-[2%]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      <div className="text-center space-y-4">
        <div className="h-8 w-48 bg-[#1f1f1f] rounded mx-auto"></div>
        <div className="h-4 w-64 bg-[#141414] rounded mx-auto"></div>
      </div>
      <div className="h-[320px] rounded-xl border border-[#1f1f1f] bg-[#141414]/80"></div>
    </div>
  );
}
