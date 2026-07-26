/* Hallmark · pre-emit critique: P5 H4 E5 S5 R5 V5 */
import { ParticleLoadingCanvas } from "./ParticleLoadingCanvas";

interface AppBootstrapLoaderProps {
  message?: string;
}

/** Particle loader reserved for initial document hydration and full reloads. */
export function AppBootstrapLoader({ message = "Loading application" }: AppBootstrapLoaderProps) {
  return (
    <div className="fixed inset-0 z-[120] flex min-h-dvh items-center justify-center overflow-hidden bg-[var(--bg)] px-4" role="status" aria-live="polite" aria-busy="true">
      <ParticleLoadingCanvas />
      <span className="sr-only">{message}</span>
    </div>
  );
}
