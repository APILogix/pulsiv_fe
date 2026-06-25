import { useEffect, useRef } from 'react';

/**
 * TelemetryCanvas — An observability-inspired ambient background.
 *
 * Renders subtle telemetry-like particles (data points), network nodes,
 * and faint connection lines that flow across the screen. Evokes the
 * feeling of "millions of telemetry events flowing through a monitoring
 * platform" without being distracting.
 *
 * Performance: uses a single <canvas>, requestAnimationFrame, and
 * avoids allocations in the hot loop.
 */

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  /** 0 = data dot, 1 = network node, 2 = trace point */
  kind: number;
  color: string;
}

const COLORS = {
  emerald: 'rgba(52, 211, 153,',    // success / healthy
  indigo: 'rgba(99, 102, 241,',      // info / requests
  amber: 'rgba(245, 158, 11,',       // warnings
  cyan: 'rgba(34, 211, 238,',        // traces
  slate: 'rgba(148, 163, 184,',      // neutral data
};

const COLOR_KEYS = Object.values(COLORS);

export function TelemetryCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // --- Create nodes ---
    const count = w > 1200 ? 120 : w > 768 ? 80 : 50;
    const nodes: Node[] = [];

    for (let i = 0; i < count; i++) {
      const kind = Math.random() < 0.15 ? 1 : Math.random() < 0.3 ? 2 : 0;
      const colorBase = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.3) * 0.12, // slight upward drift
        radius: kind === 1 ? 2 + Math.random() * 1.5 : 0.5 + Math.random() * 1.2,
        opacity: 0.15 + Math.random() * 0.35,
        kind,
        color: colorBase,
      });
    }

    // --- Connection distance ---
    const maxDist = 120;
    const maxDistSq = maxDist * maxDist;

    let frameId: number;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Update positions
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -10) n.x = w + 10;
        if (n.x > w + 10) n.x = -10;
        if (n.y < -10) n.y = h + 10;
        if (n.y > h + 10) n.y = -10;
      }

      // Draw connections between nearby network nodes
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (a.kind !== 1) continue; // only network nodes connect
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxDistSq) {
            const alpha = (1 - Math.sqrt(distSq) / maxDist) * 0.08;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${n.color} ${n.opacity})`;
        ctx.fill();

        // Network nodes get a faint outer ring
        if (n.kind === 1) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = `${n.color} ${n.opacity * 0.3})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      frameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
