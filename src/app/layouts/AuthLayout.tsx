
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
          <Outlet />
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="hidden lg:flex flex-[1.2] bg-[#080808] relative overflow-hidden items-center justify-center border-l border-[#1f1f1f]">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url('/auth-bg.png')` }}
        />
        
        {/* Gradient Overlay for blending */}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0c0c0c] via-[#0c0c0c]/40 to-transparent" />
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#0c0c0c] via-transparent to-[#0c0c0c]/20" />

        {/* Text Overlay (Optional embellishment) */}
        <div className="relative z-20 flex flex-col items-center text-center px-12 pb-12 mt-auto">
          <div className="w-12 h-1 bg-[#10b981] mb-6 rounded-full shadow-[0_0_15px_#10b981]" />
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Monitor with precision</h2>
          <p className="text-sm text-[#999999] max-w-[400px]">
            Gain real-time visibility into your API latency, errors, and ingestion volume with our state-of-the-art monitoring dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
