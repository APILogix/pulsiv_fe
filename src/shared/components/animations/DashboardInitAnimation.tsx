import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PulsivWordmark } from '../PulsivLogo';

const steps = [
  "Authenticating your session",
  "Setting up your project",
  "Gathering telemetry streams",
  "Indexing errors, traces & logs",
  "Preparing your dashboards"
];

export function DashboardInitAnimation() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        return prev; // stays on the last step
      });
    }, 1200); // changes step every 1.2s

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-start w-full max-w-[400px] text-[var(--text)] font-mono selection:bg-transparent">
      
      {/* Logo */}
      <div className="mb-10 flex items-center">
        <PulsivWordmark size={48} animate={false} />
      </div>

      {/* Steps List */}
      <div className="flex flex-col gap-4 mb-10 w-full min-h-[200px]">
        <AnimatePresence>
          {steps.map((step, index) => {
            if (index > currentStep) return null;
            
            const isActive = index === currentStep;
            
            return (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: isActive ? 1 : 0.3,
                  y: 0,
                  color: isActive ? 'var(--text)' : 'var(--text3)',
                  textShadow: isActive ? '0 0 10px rgba(255,255,255,0.2)' : 'none'
                }}
                className="text-[15px] md:text-[17px] tracking-wide"
              >
                {step}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Progress Bar Line */}
      <div className="w-full h-[1px] bg-[var(--border)] relative mb-8 overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 h-full bg-[var(--brand)]"
          initial={{ width: "0%" }}
          animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
        {/* Animated highlight scanning across the line */}
        <motion.div
          className="absolute top-0 left-0 h-full w-[20%] bg-white/50"
          animate={{ x: ['-100%', '500%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Bottom Status Text */}
      <motion.div 
        className="text-[12px] uppercase tracking-[0.2em] text-[var(--brand)] font-semibold"
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        Preparing your workspace
      </motion.div>
      
    </div>
  );
}
