
import { motion, AnimatePresence } from 'framer-motion';

interface DomainVerificationAnimationProps {
  isVerified?: boolean;
}

export function DomainVerificationAnimation({ isVerified = false }: DomainVerificationAnimationProps) {
  // Grid/network of points
  const points = [
    { cx: 30, cy: 30 }, { cx: 70, cy: 30 }, { cx: 20, cy: 60 },
    { cx: 50, cy: 50 }, { cx: 80, cy: 60 }, { cx: 40, cy: 80 }, { cx: 70, cy: 80 }
  ];

  // Connections between points
  const lines = [
    [0, 1], [0, 2], [0, 3], [1, 3], [1, 4], [2, 3], [3, 4], [2, 5], [3, 5], [3, 6], [4, 6], [5, 6]
  ];

  return (
    <div className="relative w-64 h-64 flex items-center justify-center bg-[var(--bg1)] rounded-[24px] border border-[var(--border)] shadow-sm overflow-hidden">
      
      {/* Background Grid Lines (Network) */}
      <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0 opacity-40">
        {lines.map(([p1, p2], i) => (
          <line 
            key={`line-${i}`}
            x1={points[p1].cx} y1={points[p1].cy}
            x2={points[p2].cx} y2={points[p2].cy}
            stroke="var(--border)" strokeWidth="1"
          />
        ))}
        {points.map((p, i) => (
          <circle key={`pt-${i}`} cx={p.cx} cy={p.cy} r="2" fill="var(--text3)" />
        ))}
      </svg>

      {/* Verified State Base Highlights */}
      <AnimatePresence>
        {isVerified && (
          <motion.svg 
            width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {lines.map(([p1, p2], i) => (
              <motion.line 
                key={`line-verified-${i}`}
                x1={points[p1].cx} y1={points[p1].cy}
                x2={points[p2].cx} y2={points[p2].cy}
                stroke="var(--brand)" strokeWidth="1.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              />
            ))}
            {points.map((p, i) => (
              <motion.circle 
                key={`pt-verified-${i}`} 
                cx={p.cx} cy={p.cy} r="3" fill="var(--brand)" 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              />
            ))}
          </motion.svg>
        )}
      </AnimatePresence>

      {/* Magnifying Glass (Compass/Search) */}
      <AnimatePresence mode="wait">
        {!isVerified ? (
          <motion.div
            key="magnifier"
            className="absolute w-20 h-20"
            initial={{ x: -40, y: -40, opacity: 0 }}
            animate={{ 
              x: [-40, 20, -10, 40, 0, -40],
              y: [-40, -10, 30, 10, -20, -40],
              opacity: 1
            }}
            transition={{ 
              duration: 5, 
              repeat: Infinity, 
              ease: "easeInOut",
              opacity: { duration: 0.5 }
            }}
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.3 } }}
          >
            <svg width="100%" height="100%" viewBox="0 0 100 100">
              {/* The glass area that acts as a magnifying highlight */}
              <circle cx="40" cy="40" r="30" fill="var(--brand-bg)" stroke="var(--brand)" strokeWidth="4" />
              {/* Inner crosshair / compass styling inside the magnifier */}
              <line x1="40" y1="15" x2="40" y2="25" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" />
              <line x1="40" y1="55" x2="40" y2="65" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" />
              <line x1="15" y1="40" x2="25" y2="40" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" />
              <line x1="55" y1="40" x2="65" y2="40" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" />
              
              {/* The handle */}
              <line x1="61" y1="61" x2="85" y2="85" stroke="var(--brand)" strokeWidth="8" strokeLinecap="round" />
            </svg>
          </motion.div>
        ) : (
          <motion.div
            key="check"
            className="absolute z-10 w-24 h-24 bg-[var(--brand)] rounded-full shadow-[0_0_30px_var(--brand-bg)] flex items-center justify-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 250, damping: 20, delay: 0.3 }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--brand-fg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                d="M20 6L9 17l-5-5"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
