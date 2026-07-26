/* Hallmark · pre-emit critique: P5 H4 E5 S5 R5 V5 */
import { useEffect, useRef } from "react";

type Particle = {
  originX: number; originY: number; x: number; y: number;
  size: number; alpha: number; angle: number; radius: number; noiseOffset: number;
  color: string;
};

const WIDTH = 600;
const HEIGHT = 300;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const noise = (x: number, y: number) => (Math.sin(x * 0.1 + y * 0.05) + Math.cos(x * 0.05 - y * 0.1)) * 0.5;

/** Particle text animation reserved for full document bootstrap/reload. */
export function ParticleLoadingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WIDTH * ratio;
    canvas.height = HEIGHT * ratio;
    context.scale(ratio, ratio);

    const styles = getComputedStyle(document.documentElement);
    const background = styles.getPropertyValue("--bg").trim() || "#0a0c12";
    const color = styles.getPropertyValue("--text").trim() || "#e9ecf4";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let particles: Particle[] = [];
    let animationFrame = 0;
    let disposed = false;

    const buildParticles = () => {
      const offscreen = document.createElement("canvas");
      offscreen.width = WIDTH;
      offscreen.height = HEIGHT;
      const offContext = offscreen.getContext("2d");
      if (!offContext) return;
      
      offContext.font = '600 74px "Space Grotesk", sans-serif';
      offContext.textAlign = "center";
      offContext.textBaseline = "middle";
      offContext.fillStyle = color;
      offContext.fillText("Loading", CENTER_X, CENTER_Y);
      const pixels = offContext.getImageData(0, 0, WIDTH, HEIGHT).data;
      const next: Particle[] = [];
      for (let y = 0; y < HEIGHT; y += 3) {
        for (let x = 0; x < WIDTH; x += 3) {
          const idx = (y * WIDTH + x) * 4;
          if (pixels[idx + 3] > 128) {
            next.push({
              originX: x, originY: y, x, y,
              size: Math.random() * 1.8 + 0.8,
              alpha: 1,
              angle: Math.random() * Math.PI * 2,
              radius: Math.random() * 60 + 20,
              noiseOffset: Math.random() * 1000,
              color: `rgb(${pixels[idx]}, ${pixels[idx+1]}, ${pixels[idx+2]})`,
            });
          }
        }
      }
      particles = next;
    };

    const draw = (timestamp: number) => {
      const time = timestamp / 1000;
      const phase = time % 4;
      context.fillStyle = background;
      context.fillRect(0, 0, WIDTH, HEIGHT);

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        const xProgress = particle.originX / WIDTH;

        if (reducedMotion) {
          particle.x = particle.originX;
          particle.y = particle.originY;
          particle.alpha = 1;
        } else if (phase >= 0.5 && phase < 1) {
          const progress = Math.max(0, Math.min(1, (phase - 0.5 - xProgress * 0.3) / 0.5));
          const angle = Math.atan2(particle.originY - CENTER_Y, particle.originX - CENTER_X);
          const force = progress * 80;
          const targetX = particle.originX + Math.cos(angle) * force + noise(particle.originX, phase) * 30;
          const targetY = particle.originY + Math.sin(angle) * force * 0.5 - progress * 40;
          particle.x += (targetX - particle.x) * 0.15;
          particle.y += (targetY - particle.y) * 0.15;
          particle.alpha = 1 - progress * 0.3;
        } else if (phase >= 1 && phase < 2.5) {
          const swirlPhase = phase - 1;
          particle.angle += 0.032;
          const radius = particle.radius * (0.8 + Math.sin(swirlPhase + particle.noiseOffset) * 0.2);
          const targetX = CENTER_X + Math.cos(particle.angle) * radius + noise(particle.angle * 3 + swirlPhase, particle.noiseOffset) * 20;
          const targetY = CENTER_Y + Math.sin(particle.angle) * radius * 0.6 + noise(particle.noiseOffset, particle.angle * 3 + swirlPhase) * 20;
          particle.x += (targetX - particle.x) * 0.08;
          particle.y += (targetY - particle.y) * 0.08;
          particle.alpha = 0.8 + Math.sin(swirlPhase * 3 + index * 0.01) * 0.2;
        } else if (phase >= 2.5 && phase < 3) {
          const progress = Math.max(0, Math.min(1, (phase - 2.5 - xProgress * 0.3) / 0.5));
          particle.x += (particle.originX - particle.x) * (0.1 + progress * 0.1);
          particle.y += (particle.originY - particle.y) * (0.1 + progress * 0.1);
          particle.alpha = 0.5 + progress * 0.5;
        } else {
          particle.x = particle.originX + Math.sin(time * 2 + particle.originY * 0.05) * 0.5;
          particle.y = particle.originY + Math.cos(time * 1.5 + particle.originX * 0.05) * 0.5;
          particle.alpha = 1;
        }

        context.globalAlpha = particle.alpha;
        context.fillStyle = particle.color;
        context.fillRect(particle.x, particle.y - particle.size * 1.25, particle.size, particle.size * 2.5);
      }
      context.globalAlpha = 1;
      if (!reducedMotion && !disposed) animationFrame = requestAnimationFrame(draw);
    };

    const start = () => {
      if (disposed) return;
      buildParticles();
      animationFrame = requestAnimationFrame(draw);
    };
    void document.fonts.ready.then(start);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="block h-auto w-full max-w-[600px]" aria-hidden="true" />;
}
