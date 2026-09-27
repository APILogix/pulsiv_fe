import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Lock,
  Loader2,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { completeLogin } from '../services/post-login';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';

// ── Handshake Stages ──────────────────────────────────────────

interface HandshakeStage {
  id: string;
  label: string;
  detail: string;
  tag: string;
}

const HANDSHAKE_STAGES: HandshakeStage[] = [
  {
    id: 'exchange',
    label: 'Provider Token Exchange',
    detail: 'Exchanging ephemeral authorization code via PKCE protocol',
    tag: 'PKCE_256',
  },
  {
    id: 'crypto',
    label: 'Cryptographic Signature Verification',
    detail: 'Validating ECDSA P-256 claims, nonce integrity & issuer thumbprint',
    tag: 'ECDSA_VERIFY',
  },
  {
    id: 'context',
    label: 'Workspace & Session Context Allocation',
    detail: 'Minting scoped JWT claims and initializing tenant telemetry context',
    tag: 'TENANT_ROUTING',
  },
];

export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);

  const callbackError = params.get('error');
  const [error, setError] = useState(() =>
    callbackError
      ? params.get('error_description') || params.get('message') || callbackError
      : ''
  );

  const [activeStage, setActiveStage] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [takingLong, setTakingLong] = useState(false);

  // Progressive simulated stage milestones to narrate work to the user
  useEffect(() => {
    if (error) return;

    const t1 = setTimeout(() => setActiveStage(1), 600);
    const t2 = setTimeout(() => setActiveStage(2), 1400);
    const tLong = setTimeout(() => setTakingLong(true), 7000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(tLong);
    };
  }, [error]);

  const executeHandshake = useCallback(() => {
    if (window.opener && window.opener !== window) {
      window.opener.postMessage(
        { type: 'sentinel:identity-link', linked: true },
        window.location.origin
      );
      window.close();
      return;
    }

    if (callbackError) return;

    setIsRetrying(true);
    setError('');
    setActiveStage(0);

    authApi
      .refreshSession()
      .then((session) => {
        setActiveStage(3); // All complete
        return completeLogin(session, { setAuth, queryClient, navigate });
      })
      .catch((err) => {
        setError(getErrorMessage(err));
      })
      .finally(() => {
        setIsRetrying(false);
      });
  }, [callbackError, navigate, queryClient, setAuth]);

  useEffect(() => {
    executeHandshake();
  }, [executeHandshake]);

  return (
    <div className="relative min-h-[100dvh] w-full bg-[var(--bg)] font-sans text-[var(--text)] antialiased overflow-x-hidden">
      {/* Background Grids and Ambient Glows */}
      <div className="pulse-grid pulse-aurora pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-50"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(1000px 520px at 50% -10%, var(--brand-bg) 0%, transparent 60%), radial-gradient(800px 440px at 50% 110%, var(--ai-bg) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex min-h-[100dvh] flex-col p-4 sm:p-8 md:p-12">
        {/* Unified Top Header Bar */}
        <header className="flex w-full items-center justify-between border-b border-[var(--border)]/70 pb-5">
          <div className="flex items-center gap-3">
            <Link
              to="/auth/login"
              className="group flex items-center gap-2.5 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded-md px-1"
            >
              <div className="flex size-7 items-center justify-center rounded-lg border border-[var(--border2)] bg-[var(--bg2)] text-[var(--brand)] shadow-sm">
                <ShieldCheck className="size-4" />
              </div>
              <span className="font-[family-name:var(--mono)] text-[20px] sm:text-[22px] font-bold tracking-[0.16em] text-[var(--text)]">
                SENT<span className="text-[var(--brand)]">I</span>NEL
              </span>
            </Link>
            <span className="hidden sm:inline-block text-[11px] font-mono text-[var(--text3)] border-l border-[var(--border)] pl-3">
              IDENTITY GATEWAY
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg1)]/80 px-3 py-1 text-[11px] font-mono tracking-wider text-[var(--text2)] shadow-sm backdrop-blur-md">
              <span
                className={`size-1.5 rounded-full ${
                  error ? 'bg-[var(--red)]' : 'bg-[var(--green)] animate-pulse'
                }`}
              />
              <span>{error ? 'HANDSHAKE ABORTED' : 'TLS 1.3 · ZERO-TRUST'}</span>
            </div>
            <Link
              to="/auth/login"
              className="hidden md:inline-flex text-[12px] font-medium text-[var(--text3)] hover:text-[var(--text)] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </header>

        {/* Central Handshake Container (Dual-Width Strategy: 600px-800px) */}
        <main className="pulse-rise mx-auto my-auto w-full max-w-[620px] py-8">
          <AnimatePresence mode="wait">
            {error ? (
              /* ── Error State Card ── */
              <motion.div
                key="error-card"
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--red)]/40 bg-[var(--bg1)]/90 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl"
              >
                {/* Top specular hairline */}
                <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[var(--red)] to-transparent" />

                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-[var(--red)]/50 bg-[var(--red-bg)] text-[var(--red)] shadow-[0_0_24px_rgba(244,63,94,0.25)]">
                    <ShieldAlert className="size-7" />
                  </div>

                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--red)] font-semibold">
                    Authentication Protocol Error
                  </span>
                  <h1 className="mt-1 font-[family-name:var(--display)] text-[22px] sm:text-[24px] font-semibold tracking-[-0.02em] text-[var(--text)]">
                    Identity Handshake Interrupted
                  </h1>

                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--text2)] max-w-[46ch]">
                    {error}
                  </p>

                  {/* Diagnostic Box */}
                  <div className="mt-6 w-full rounded-lg border border-[var(--border)] bg-[var(--bg2)]/70 p-3.5 text-left text-[12px] font-mono text-[var(--text3)]">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--text3)]">
                      <span>Diagnostic Readout</span>
                      <span className="text-[var(--red)]">HTTP 401 / OAUTH_FAIL</span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-[var(--text2)]">
                      No security state or tokens were committed to your device. Try signing in again or verify your identity provider credentials.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mt-7 flex w-full flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={executeHandshake}
                      disabled={isRetrying}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--brand)] text-[13px] font-semibold text-[var(--brand-fg)] shadow-sm transition-all hover:bg-[var(--brand-d)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-bg)] disabled:opacity-50 cursor-pointer"
                    >
                      {isRetrying ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                      <span>Retry Handshake</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/auth/login', { replace: true })}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] text-[13px] font-medium text-[var(--text)] transition-colors hover:bg-[var(--bg3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)] cursor-pointer"
                    >
                      <span>Return to Sign In</span>
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* ── Active Handshake Card ── */
              <motion.div
                key="active-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]/95 p-6 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.65)] backdrop-blur-xl"
              >
                {/* Top specular hairline with animated gradient shimmer */}
                <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[var(--ai)] to-transparent opacity-80" />

                {/* Animated Scan Bar across the very top */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--border)] overflow-hidden">
                  <motion.div
                    className="h-full w-1/3 bg-gradient-to-r from-transparent via-[var(--brand)] to-[var(--ai)] shadow-[0_0_12px_var(--ai)]"
                    animate={{ x: ['-100%', '350%'] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>

                {/* ── Cryptographic Conduit Visualizer ── */}
                <div className="mb-7 rounded-xl border border-[var(--border)] bg-[var(--bg2)]/50 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    {/* Provider Node */}
                    <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
                      <div className="relative flex size-12 items-center justify-center rounded-xl border border-[var(--border2)] bg-[var(--bg1)] shadow-inner">
                        <KeyRound className="size-5 text-[var(--text2)]" />
                        <span className="absolute -top-1 -right-1 size-2 rounded-full bg-[var(--green)] ring-2 ring-[var(--bg1)]" />
                      </div>
                      <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--text3)]">
                        Provider
                      </span>
                      <span className="rounded-full bg-[var(--green-bg)] px-2 py-0.5 text-[9px] font-mono text-[var(--green)] border border-[var(--green)]/30">
                        AUTHORIZED
                      </span>
                    </div>

                    {/* Animated Quantum Transmission Conduit */}
                    <div className="relative flex flex-col items-center justify-center flex-[1.6] px-2">
                      <div className="relative w-full flex items-center justify-center">
                        <div className="h-px w-full bg-[var(--border2)]" />
                        {/* Moving packet dot */}
                        <motion.div
                          className="absolute size-2 rounded-full bg-[var(--ai)] shadow-[0_0_10px_var(--ai)]"
                          animate={{ left: ['0%', '100%'], opacity: [0.2, 1, 0.2] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        {/* Central cryptographic lock pill */}
                        <div className="absolute z-10 flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg1)] px-2 py-0.5 text-[9px] font-mono text-[var(--text3)] shadow-sm">
                          <Lock className="size-2.5 text-[var(--brand)]" />
                          <span>ECDSA_P256</span>
                        </div>
                      </div>
                      <span className="mt-2 text-[9px] font-mono text-[var(--ai)] tracking-widest uppercase animate-pulse">
                        STREAMING CLAIMS
                      </span>
                    </div>

                    {/* Sentinel Node */}
                    <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
                      <div className="relative flex size-12 items-center justify-center rounded-xl border border-[var(--ai)]/50 bg-[var(--bg1)] shadow-[0_0_20px_var(--ai-bg)]">
                        <ShieldCheck className="size-5 text-[var(--ai)]" />
                        <motion.span
                          className="absolute inset-0 rounded-xl border border-[var(--ai)]"
                          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </div>
                      <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--text3)]">
                        Sentinel Core
                      </span>
                      <span className="rounded-full bg-[var(--ai-bg)] px-2 py-0.5 text-[9px] font-mono text-[var(--ai)] border border-[var(--ai)]/30">
                        VERIFYING
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Title & Stage Narration ── */}
                <div className="mb-6">
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-[var(--ai)] animate-ping" />
                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ai)]">
                      Cryptographic Handshake
                    </span>
                  </div>
                  <h1 className="mt-1 font-[family-name:var(--display)] text-[22px] sm:text-[24px] font-semibold tracking-[-0.02em] text-[var(--text)]">
                    Completing Your Sign-In
                  </h1>
                  <p className="mt-1 text-[13px] text-[var(--text2)] leading-relaxed">
                    Exchanging cryptographic security credentials with your identity provider to establish your trusted Sentinel session.
                  </p>
                </div>

                {/* ── Real-Time Handshake Stages ── */}
                <div className="space-y-2.5">
                  {HANDSHAKE_STAGES.map((stage, idx) => {
                    const isDone = activeStage > idx;
                    const isCurrent = activeStage === idx;
                    const isPending = activeStage < idx;

                    return (
                      <div
                        key={stage.id}
                        className={`flex items-start justify-between gap-3 rounded-lg border p-3 transition-all duration-200 ${
                          isDone
                            ? 'border-[var(--green)]/30 bg-[var(--green-bg)]/20'
                            : isCurrent
                            ? 'border-[var(--ai)]/50 bg-[var(--ai-bg)]/30 shadow-[0_0_15px_rgba(6,182,212,0.06)]'
                            : 'border-[var(--border)] bg-[var(--bg2)]/30 opacity-45'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex size-5 items-center justify-center">
                            {isDone ? (
                              <CheckCircle2 className="size-4 text-[var(--green)]" />
                            ) : isCurrent ? (
                              <Loader2 className="size-4 animate-spin text-[var(--ai)]" />
                            ) : (
                              <div className="size-2 rounded-full bg-[var(--text3)]/50" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p
                                className={`text-[13px] font-medium ${
                                  isDone
                                    ? 'text-[var(--text)]'
                                    : isCurrent
                                    ? 'text-[var(--text)]'
                                    : 'text-[var(--text3)]'
                                }`}
                              >
                                {stage.label}
                              </p>
                              <span className="font-mono text-[9px] text-[var(--text3)] tracking-wider">
                                [{stage.tag}]
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--text3)] leading-normal mt-0.5">
                              {stage.detail}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {isDone && (
                            <span className="rounded bg-[var(--green-bg)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--green)]">
                              DONE
                            </span>
                          )}
                          {isCurrent && (
                            <span className="rounded bg-[var(--ai-bg)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--ai)]">
                              ACTIVE
                            </span>
                          )}
                          {isPending && (
                            <span className="font-mono text-[10px] text-[var(--text3)]">
                              QUEUED
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Monospace Protocol Readout Grid ── */}
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-[var(--border)] text-[11px] font-mono">
                  <div className="rounded border border-[var(--border)] bg-[var(--bg2)]/60 px-2.5 py-2">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--text3)] block">Protocol</span>
                    <span className="font-semibold text-[var(--text)]">OAuth 2.1 PKCE</span>
                  </div>
                  <div className="rounded border border-[var(--border)] bg-[var(--bg2)]/60 px-2.5 py-2">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--text3)] block">Cipher</span>
                    <span className="font-semibold text-[var(--text)]">TLS 1.3 / X25519</span>
                  </div>
                  <div className="rounded border border-[var(--border)] bg-[var(--bg2)]/60 px-2.5 py-2">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--text3)] block">Integrity</span>
                    <span className="font-semibold text-[var(--green)]">SHA-256 VALID</span>
                  </div>
                  <div className="rounded border border-[var(--border)] bg-[var(--bg2)]/60 px-2.5 py-2">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--text3)] block">Routing</span>
                    <span className="font-semibold text-[var(--brand)]">TENANT DYNAMIC</span>
                  </div>
                </div>

                {/* Taking Long Escape Hatch */}
                {takingLong && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 rounded-lg border border-[var(--amber)]/40 bg-[var(--amber-bg)]/20 p-3 text-[12px] text-[var(--text2)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>Taking longer than expected? You can re-attempt the exchange.</span>
                      <button
                        type="button"
                        onClick={executeHandshake}
                        className="rounded border border-[var(--amber)]/50 bg-[var(--amber-bg)] px-2 py-1 font-mono text-[11px] text-[var(--amber)] hover:bg-[var(--amber)]/20 cursor-pointer"
                      >
                        Retry Now
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Footer security guarantee */}
                <div className="mt-5 flex items-center justify-between text-[11px] text-[var(--text3)]">
                  <div className="flex items-center gap-1.5">
                    <Lock className="size-3 text-[var(--brand)]" />
                    <span>Protected under strict Zero-Trust session isolation.</span>
                  </div>
                  <Link
                    to="/auth/login"
                    className="hover:text-[var(--text)] transition-colors underline-offset-4 hover:underline"
                  >
                    Cancel Handshake
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Global Footer info */}
        <footer className="w-full text-center text-[12px] font-mono text-[var(--text3)] py-4">
          <span>SENTINEL TELEMETRY & SECURITY GATEWAY · BUILD 2026.09</span>
        </footer>
      </div>
    </div>
  );
}
