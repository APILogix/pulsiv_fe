import React, { useState, useEffect } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { Navigate, useRouteError, isRouteErrorResponse, Link, useNavigate } from 'react-router';
import {
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Home,
  Copy,
  Check,
  Terminal,
  Cpu,
  FileCode2,
  ExternalLink,
  ShieldAlert,
  WifiOff,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  Download,
  WrapText,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import NotFoundPage from '@/shared/components/NotFoundPage';
import {
  StatusPill,
  AiSpark,
  ConfidencePill,
  SentinelLogoMark,
  type StatusTone,
} from '@/shared/ui/sentinel';
import { Button } from '@/components/ui/button';

export function isMissingProjectShellError(error: unknown): boolean {
  return error instanceof Error && error.message === 'useCurrentProject must be used within ProjectShellPage';
}

export type ErrorClassification = 'chunk' | 'network' | 'auth' | 'route' | 'runtime';

export interface ParsedErrorDetails {
  name: string;
  message: string;
  stack?: string;
  statusCode?: number;
  category: ErrorClassification;
  incidentId: string;
  timestamp: string;
  originLocation?: string;
}

export interface ParsedStackFrame {
  raw: string;
  fnName: string;
  location: string;
  isAppCode: boolean;
  lineNumber?: string;
  columnNumber?: string;
}

function generateIncidentId(): string {
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ERR-${ts}-${rand}`;
}

export function parseError(error: unknown): ParsedErrorDetails {
  let name = 'RuntimeError';
  let message = 'An unexpected runtime error interrupted this view.';
  let stack: string | undefined;
  let statusCode: number | undefined;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    name = `HTTP ${error.status} ${error.statusText || 'Route Error'}`;
    message = typeof error.data === 'string' ? error.data : error.statusText || 'Route resolution failed on the upstream gateway.';
    if (error.data && typeof error.data === 'object' && 'stack' in error.data) {
      stack = String((error.data as { stack: unknown }).stack);
    }
  } else if (error instanceof Error) {
    name = error.name || 'Error';
    message = error.message || 'An error occurred without a descriptive message.';
    stack = error.stack;
  } else if (typeof error === 'string') {
    name = 'Exception';
    message = error;
  } else if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>;
    if (typeof candidate.name === 'string') name = candidate.name;
    if (typeof candidate.message === 'string') message = candidate.message;
    if (typeof candidate.stack === 'string') stack = candidate.stack;
    if (typeof candidate.status === 'number') statusCode = candidate.status;
  }

  let category: ErrorClassification = 'runtime';
  const combined = (name + ' ' + message).toLowerCase();

  if (
    name === 'ChunkLoadError' ||
    combined.includes('chunkloaderror') ||
    combined.includes('dynamically imported module') ||
    combined.includes('loading chunk') ||
    combined.includes('failed to fetch dynamically imported module') ||
    combined.includes('importing a module script failed')
  ) {
    category = 'chunk';
  } else if (statusCode === 401 || statusCode === 403 || combined.includes('unauthorized') || combined.includes('forbidden')) {
    category = 'auth';
  } else if (statusCode && statusCode >= 500) {
    category = 'route';
  } else if (combined.includes('failed to fetch') || combined.includes('network error') || combined.includes('load failed') || combined.includes('net::err')) {
    category = 'network';
  }

  return {
    name,
    message,
    stack,
    statusCode,
    category,
    incidentId: generateIncidentId(),
    timestamp: new Date().toISOString(),
  };
}

export function parseStackTrace(stack?: string): ParsedStackFrame[] {
  if (!stack) return [];
  const lines = stack.split('\n');
  const frames: ParsedStackFrame[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('at ')) continue;

    const content = trimmed.slice(3);
    const match = content.match(/^(?:(.*?) \()?([^)]+)\)?$/);
    if (match) {
      const fnName = match[1] || 'anonymous';
      const fullLoc = match[2];
      const isAppCode = (fullLoc.includes('/src/') || fullLoc.includes('\\src\\')) && !fullLoc.includes('node_modules');

      const locMatch = fullLoc.match(/:(\d+):(\d+)$/);
      const lineNumber = locMatch ? locMatch[1] : undefined;
      const columnNumber = locMatch ? locMatch[2] : undefined;
      const location = locMatch ? fullLoc.replace(/:(\d+):(\d+)$/, '') : fullLoc;

      frames.push({
        raw: trimmed,
        fnName,
        location,
        isAppCode,
        lineNumber,
        columnNumber,
      });
    } else {
      frames.push({
        raw: trimmed,
        fnName: 'eval',
        location: content,
        isAppCode: content.includes('/src/') && !content.includes('node_modules'),
      });
    }
  }

  return frames;
}

interface AiDiagnosis {
  title: string;
  summary: string;
  confidence: number;
  remediation: string;
  actionLabel: string;
  actionType: 'retry' | 'reload' | 'home';
  tags: string[];
}

function getAiDiagnosis(parsed: ParsedErrorDetails): AiDiagnosis {
  switch (parsed.category) {
    case 'chunk':
      return {
        title: 'New Deployment Asset Mismatch',
        summary: 'A newer release of Sentinel was deployed to edge edge nodes. The browser attempted to resolve an older JavaScript bundle hash that was superseded.',
        confidence: 99,
        remediation: 'Perform a full reload to fetch updated chunks and synchronise with the active release.',
        actionLabel: 'Update & reload application',
        actionType: 'reload',
        tags: ['deployment-sync', 'vite-chunk', 'cache-stale'],
      };
    case 'network':
      return {
        title: 'Network Transport Interrupted',
        summary: 'The browser could not establish or sustain an HTTP connection with the host. This typically indicates momentary Wi-Fi latency, VPN disconnection, or host gateway timeout.',
        confidence: 94,
        remediation: 'Verify connectivity and retry. The application will resume without state loss once the connection re-establishes.',
        actionLabel: 'Retry connection',
        actionType: 'retry',
        tags: ['transport-error', 'connection-lost', 'offline-guard'],
      };
    case 'auth':
      return {
        title: 'Session Token Invalidation',
        summary: 'The active authentication session expired or lacked necessary project-level permission claims for this route.',
        confidence: 97,
        remediation: 'Re-authenticate or refresh credentials to regain access.',
        actionLabel: 'Return to login',
        actionType: 'home',
        tags: ['auth-session', 'token-expired', 'security-boundary'],
      };
    case 'route':
      return {
        title: 'Upstream API Gateway Exception',
        summary: `The backend service returned HTTP ${parsed.statusCode || 500} while fulfilling this route. The frontend UI shell and navigation remain fully functional.`,
        confidence: 91,
        remediation: 'Retry the request, or return to the overview while backend services recover.',
        actionLabel: 'Retry route request',
        actionType: 'retry',
        tags: ['upstream-5xx', 'service-health', 'edge-gateway'],
      };
    default:
      if (parsed.name === 'TypeError') {
        return {
          title: 'Unchecked Null or Property Dereference',
          summary: 'A component attempted to access properties or methods on an uninitialized data structure during rendering. This is frequently triggered by schema shifts or transient cache misses.',
          confidence: 96,
          remediation: 'Resetting the view clears transient render state. Check the diagnostics trace below for the specific source frame.',
          actionLabel: 'Reset component state',
          actionType: 'retry',
          tags: ['type-error', 'null-deref', 'render-boundary'],
        };
      }
      return {
        title: 'Isolated Runtime Render Fault',
        summary: 'An unhandled exception occurred within the React rendering pipeline. Sentinel contained the failure inside this boundary to protect adjacent navigation and telemetry workers.',
        confidence: 89,
        remediation: 'Attempt to reload the component view. If the issue recurs, copy the diagnostic report for engineering review.',
        actionLabel: 'Try recovering view',
        actionType: 'retry',
        tags: ['runtime-exception', 'react-boundary', 'isolated'],
      };
  }
}

export interface AppErrorFallbackProps {
  error: unknown;
  resetErrorBoundary?: () => void;
  isRootRoute?: boolean;
  title?: string;
  onReport?: (payload: ParsedErrorDetails) => void;
}

export function AppErrorFallback({
  error,
  resetErrorBoundary,
  isRootRoute = false,
  title,
  onReport,
}: AppErrorFallbackProps) {
  if (isMissingProjectShellError(error)) {
    return <Navigate to="/projects" replace />;
  }

  const navigate = useNavigate();
  const [parsed] = useState(() => parseError(error));
  const aiDiagnosis = getAiDiagnosis(parsed);
  const frames = parseStackTrace(parsed.stack);

  const [activeTab, setActiveTab] = useState<'stack' | 'env' | 'ai' | 'raw'>('stack');
  const [isRetrying, setIsRetrying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);

  // Safe Environment Info
  const envInfo: Record<string, string> = {
    'Route URL': typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : 'SSR',
    'Incident Reference': parsed.incidentId,
    'Timestamp (UTC)': parsed.timestamp,
    'User Agent': typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    'Connection Status': typeof navigator !== 'undefined' && navigator.onLine ? 'Connected' : 'Offline',
    'Screen Resolution': typeof window !== 'undefined' ? `${window.innerWidth} × ${window.innerHeight}` : 'N/A',
    'Theme Setting': typeof document !== 'undefined' ? (document.documentElement.getAttribute('data-theme') || 'mono') : 'mono',
  };

  useEffect(() => {
    if (onReport) {
      try {
        onReport(parsed);
      } catch {
        // Silently preserve stability
      }
    }
  }, [onReport, parsed]);

  // Keyboard shortcut listeners
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when inside inputs/textareas
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        if (e.shiftKey) {
          window.location.reload();
        } else {
          e.preventDefault();
          handleRetry();
        }
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        copyDiagnosticReport();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/dashboard');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleRetry = () => {
    if (isRetrying) return;
    setIsRetrying(true);
    setRetryAttempts((prev) => prev + 1);

    setTimeout(() => {
      if (resetErrorBoundary) {
        resetErrorBoundary();
      } else {
        window.location.reload();
      }
      setIsRetrying(false);
    }, 280);
  };

  const copyIncidentId = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(parsed.incidentId);
      }
      setCopiedId(true);
      toast.success('Incident ID copied to clipboard');
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      toast.error('Unable to access clipboard');
    }
  };

  const copyDiagnosticReport = async () => {
    const report = [
      `# Sentinel Runtime Diagnostic Report`,
      `- **Incident ID:** \`${parsed.incidentId}\``,
      `- **Timestamp:** ${parsed.timestamp}`,
      `- **Classification:** ${parsed.category.toUpperCase()} (${parsed.name})`,
      `- **Exception:** ${parsed.message}`,
      `- **Route Path:** \`${envInfo['Route URL']}\``,
      `- **Browser:** ${envInfo['User Agent']}`,
      `- **Network:** ${envInfo['Connection Status']}`,
      `- **Resolution:** ${envInfo['Screen Resolution']}`,
      ``,
      `## AI Diagnostics`,
      `- **Diagnosis:** ${aiDiagnosis.title}`,
      `- **Confidence:** ${aiDiagnosis.confidence}%`,
      `- **Remediation:** ${aiDiagnosis.remediation}`,
      ``,
      `## Stack Trace`,
      '```text',
      parsed.stack || 'No stack trace available for this exception',
      '```',
      ``,
      `## Environment Details`,
      '```json',
      JSON.stringify(envInfo, null, 2),
      '```',
    ].join('\n');

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(report);
      }
      setCopied(true);
      toast.success('Diagnostic report copied to clipboard');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error('Unable to access clipboard');
    }
  };

  const downloadJsonReport = () => {
    const payload = {
      incidentId: parsed.incidentId,
      timestamp: parsed.timestamp,
      error: {
        name: parsed.name,
        message: parsed.message,
        statusCode: parsed.statusCode,
        category: parsed.category,
        stack: parsed.stack,
      },
      aiDiagnosis,
      environment: envInfo,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel-${parsed.incidentId.toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded incident diagnostic JSON');
  };

  const statusTone: StatusTone =
    parsed.category === 'chunk'
      ? 'info'
      : parsed.category === 'network'
        ? 'warn'
        : parsed.category === 'auth'
          ? 'warn'
          : 'error';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'w-full flex flex-col items-center justify-center font-[family-name:var(--sans)] text-[var(--text)] transition-colors selection:bg-[var(--brand-bg)] selection:text-[var(--brand)]',
        isRootRoute
          ? 'min-h-screen bg-[var(--bg)] p-4 sm:p-6 lg:p-10 relative overflow-x-hidden'
          : 'h-full min-h-[480px] p-4 sm:p-6 lg:p-8'
      )}
    >
      {/* Root route brand header */}
      {isRootRoute && (
        <header className="w-full max-w-4xl flex items-center justify-between py-4 mb-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <SentinelLogoMark size={24} />
            <span className="font-[family-name:var(--display)] text-sm font-semibold tracking-[-0.01em] text-[var(--text)]">
              Sentinel
            </span>
            <span className="text-[var(--border2)]">/</span>
            <span className="text-xs text-[var(--text3)]">Incident Isolation</span>
          </div>

          <div className="flex items-center gap-3">
            <StatusPill tone={statusTone} dot={false}>
              {parsed.category === 'chunk' ? 'Asset Desync' : parsed.category === 'network' ? 'Connection Lost' : 'Diagnostic Mode'}
            </StatusPill>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <Home className="size-3.5" />
                Console
              </Link>
            </Button>
          </div>
        </header>
      )}

      {/* Main Incident Console Card */}
      <div className="w-full max-w-4xl flex flex-col gap-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-6 sm:p-8 shadow-[var(--shadow-modal)] relative transition-all duration-200">
        
        {/* Header Row: Severity Badge, Title, Incident Tag */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] border",
              parsed.category === 'network' || parsed.category === 'auth'
                ? "bg-[var(--amber-bg)] text-[var(--amber)] border-[rgba(245,158,11,0.2)]"
                : parsed.category === 'chunk'
                  ? "bg-[var(--blue-bg)] text-[var(--blue)] border-[rgba(96,165,250,0.2)]"
                  : "bg-[var(--red-bg)] text-[var(--red)] border-[rgba(239,68,68,0.2)]"
            )}>
              {parsed.category === 'network' ? (
                <WifiOff className="size-5 stroke-[1.8]" />
              ) : (
                <AlertTriangle className="size-5 stroke-[1.8]" />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-[family-name:var(--display)] text-lg sm:text-xl font-semibold tracking-[-0.02em] text-[var(--text)]">
                  {title || (parsed.category === 'chunk'
                    ? 'Application bundle update available'
                    : parsed.category === 'network'
                      ? 'Network connection interrupted'
                      : parsed.category === 'auth'
                        ? 'Authentication required'
                        : 'Runtime exception captured')}
                </h1>
                <StatusPill tone={statusTone} dot={false}>
                  {parsed.name}
                </StatusPill>
              </div>

              <p className="text-[13px] leading-relaxed text-[var(--text2)] max-w-2xl">
                {parsed.category === 'chunk'
                  ? 'A newer application release was deployed. Reloading will fetch the latest assets and restore full functionality.'
                  : parsed.category === 'network'
                    ? 'The application was unable to reach the telemetry gateway. Your session remains preserved while reconnecting.'
                    : 'Sentinel isolated an unhandled exception to prevent cascading failures. Diagnostic telemetry was recorded.'}
              </p>
            </div>
          </div>

          {/* Incident ID Affordance */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
            <span className="text-[11px] text-[var(--text3)] uppercase font-[family-name:var(--mono)] tracking-wider">
              Incident ID
            </span>
            <button
              type="button"
              onClick={copyIncidentId}
              title="Click to copy incident reference"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-2 py-1 font-[family-name:var(--mono)] text-[11px] text-[var(--text)] transition-colors hover:border-[var(--text3)] cursor-pointer"
            >
              <span>{parsed.incidentId}</span>
              {copiedId ? (
                <Check className="size-3 text-[var(--green)]" />
              ) : (
                <Copy className="size-3 text-[var(--text3)]" />
              )}
            </button>
          </div>
        </div>

        {/* Sentinel AI Diagnostics Insight Card (§7 Three-Channel Law) */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg2)] p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <AiSpark size={14} className="text-[var(--ai)]" />
              <h2 className="text-[13px] font-semibold text-[var(--text)]">
                {aiDiagnosis.title}
              </h2>
            </div>
            <ConfidencePill value={aiDiagnosis.confidence} />
          </div>

          <p className="text-[13px] leading-relaxed text-[var(--text2)] mb-3">
            {aiDiagnosis.summary}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--text3)]">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--text2)]">Recommended action:</span>
              <span>{aiDiagnosis.remediation}</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {aiDiagnosis.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-[family-name:var(--mono)] text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[var(--bg1)] text-[var(--text3)] border border-[var(--border)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Persistent failure notice if user clicked retry multiple times */}
        {retryAttempts >= 2 && (
          <div className="rounded-[var(--radius)] border border-[rgba(245,158,11,0.25)] bg-[var(--amber-bg)] px-4 py-3 text-[12px] leading-relaxed text-[var(--amber)] flex items-start gap-2.5">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Multiple recovery attempts did not resolve this exception.</p>
              <p className="opacity-90 mt-0.5">
                The issue appears linked to state synchronization or outdated scripts. We advise performing a full page reload or returning to the dashboard.
              </p>
            </div>
          </div>
        )}

        {/* Primary Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary Action Button */}
            <Button
              variant="default"
              onClick={handleRetry}
              disabled={isRetrying}
              className="gap-2"
            >
              <RotateCcw className={cn('size-4', isRetrying && 'animate-spin')} />
              <span>{isRetrying ? 'Attempting recovery…' : 'Try recovering view'}</span>
              <kbd className="hidden sm:inline-block rounded bg-[var(--brand-fg)]/20 px-1 py-0.2 text-[10px] font-[family-name:var(--mono)] opacity-80">
                R
              </kbd>
            </Button>

            {/* Reload Page Button */}
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw className="size-3.5 text-[var(--text2)]" />
              <span>Reload page</span>
              <kbd className="hidden sm:inline-block rounded bg-[var(--bg3)] px-1 py-0.2 text-[10px] font-[family-name:var(--mono)] text-[var(--text3)]">
                ⇧R
              </kbd>
            </Button>

            {/* Back to Safety Navigation */}
            <Button variant="ghost" asChild>
              <Link to="/dashboard" className="gap-2">
                <Home className="size-3.5" />
                <span>Return to Overview</span>
                <kbd className="hidden sm:inline-block rounded bg-[var(--bg2)] px-1 py-0.2 text-[10px] font-[family-name:var(--mono)] text-[var(--text3)]">
                  Esc
                </kbd>
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Full Diagnostic Report */}
            <Button
              variant="outline"
              onClick={copyDiagnosticReport}
              className="gap-2"
              title="Copy complete diagnostics bundle including stack and system info (C)"
            >
              {copied ? (
                <Check className="size-3.5 text-[var(--green)]" />
              ) : (
                <Copy className="size-3.5 text-[var(--text2)]" />
              )}
              <span>{copied ? 'Copied bundle!' : 'Copy diagnostic report'}</span>
              <kbd className="hidden sm:inline-block rounded bg-[var(--bg2)] px-1 py-0.2 text-[10px] font-[family-name:var(--mono)] text-[var(--text3)]">
                C
              </kbd>
            </Button>
          </div>
        </div>

        {/* Diagnostics Workbench Pane */}
        <div className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg)] overflow-hidden shadow-inner flex flex-col">
          {/* Tab Bar */}
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('stack')}
                className={cn(
                  'flex items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer',
                  activeTab === 'stack'
                    ? 'bg-[var(--bg1)] text-[var(--text)] border border-[var(--border)] shadow-xs'
                    : 'text-[var(--text3)] hover:text-[var(--text2)]'
                )}
              >
                <Terminal className="size-3.5" />
                <span>Stack trace</span>
                {frames.length > 0 && (
                  <span className="font-[family-name:var(--mono)] text-[10px] px-1 rounded bg-[var(--bg3)] text-[var(--text2)]">
                    {frames.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('env')}
                className={cn(
                  'flex items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer',
                  activeTab === 'env'
                    ? 'bg-[var(--bg1)] text-[var(--text)] border border-[var(--border)] shadow-xs'
                    : 'text-[var(--text3)] hover:text-[var(--text2)]'
                )}
              >
                <Cpu className="size-3.5" />
                <span>System environment</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('raw')}
                className={cn(
                  'flex items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer',
                  activeTab === 'raw'
                    ? 'bg-[var(--bg1)] text-[var(--text)] border border-[var(--border)] shadow-xs'
                    : 'text-[var(--text3)] hover:text-[var(--text2)]'
                )}
              >
                <FileCode2 className="size-3.5" />
                <span>Raw payload</span>
              </button>
            </div>

            {/* Workbench secondary controls */}
            <div className="flex items-center gap-2">
              {activeTab === 'stack' && (
                <button
                  type="button"
                  onClick={() => setWrapLines((w) => !w)}
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded transition-colors cursor-pointer',
                    wrapLines ? 'bg-[var(--bg3)] text-[var(--text)]' : 'text-[var(--text3)] hover:text-[var(--text2)]'
                  )}
                  title="Toggle line wrapping"
                >
                  <WrapText className="size-3" />
                  <span>Wrap lines</span>
                </button>
              )}

              <button
                type="button"
                onClick={downloadJsonReport}
                className="inline-flex items-center gap-1 text-[11px] text-[var(--text3)] hover:text-[var(--text)] px-2 py-0.5 rounded transition-colors cursor-pointer"
                title="Download incident record as JSON"
              >
                <Download className="size-3" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Stack Trace Content */}
          {activeTab === 'stack' && (
            <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-auto max-h-[360px] custom-scrollbar">
              {/* Exception message callout */}
              <div className="rounded-[var(--radius)] bg-[var(--bg1)] border border-[var(--border)] p-3 font-[family-name:var(--mono)] text-[12px] leading-relaxed">
                <div className="flex items-center gap-2 text-[var(--red)] font-semibold mb-1">
                  <span>Exception:</span>
                  <span>{parsed.name}</span>
                </div>
                <div className="text-[var(--text)] break-words">
                  {parsed.message}
                </div>
              </div>

              {/* Stack frames */}
              {frames.length > 0 ? (
                <div className="flex flex-col divide-y divide-[var(--border)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden bg-[var(--bg1)]">
                  {frames.map((frame, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex items-start gap-3 px-3 py-2 text-[12px] font-[family-name:var(--mono)] transition-colors hover:bg-[var(--bg2)]',
                        frame.isAppCode ? 'bg-[var(--brand-bg)]/30' : 'opacity-80'
                      )}
                    >
                      <span className="w-6 shrink-0 text-right text-[11px] text-[var(--text3)] select-none">
                        {index + 1}
                      </span>

                      <div className={cn('flex-1 min-w-0', wrapLines ? 'break-all' : 'truncate')}>
                        <span className={cn('font-medium', frame.isAppCode ? 'text-[var(--text)]' : 'text-[var(--text2)]')}>
                          {frame.fnName}
                        </span>
                        <span className="text-[var(--text3)] mx-1.5">at</span>
                        <span className={cn(frame.isAppCode ? 'text-[var(--text2)] underline decoration-dotted' : 'text-[var(--text3)]')}>
                          {frame.location}
                        </span>
                        {frame.lineNumber && (
                          <span className="text-[var(--brand)] ml-1">
                            :{frame.lineNumber}:{frame.columnNumber || '1'}
                          </span>
                        )}
                        {frame.isAppCode && (
                          <span className="ml-2 text-[10px] font-sans font-semibold uppercase tracking-wider px-1 py-0.2 rounded bg-[var(--brand-bg)] text-[var(--text)]">
                            app source
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : parsed.stack ? (
                <pre className={cn(
                  'font-[family-name:var(--mono)] text-[12px] leading-relaxed text-[var(--text2)] bg-[var(--bg1)] p-4 rounded-[var(--radius)] border border-[var(--border)] overflow-auto',
                  wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                )}>
                  {parsed.stack}
                </pre>
              ) : (
                <div className="py-8 text-center text-xs text-[var(--text3)]">
                  No stack trace was emitted for this exception object.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: System Environment Content */}
          {activeTab === 'env' && (
            <div className="p-4 sm:p-5 overflow-auto max-h-[360px]">
              <div className="border border-[var(--border)] rounded-[var(--radius)] overflow-hidden bg-[var(--bg1)]">
                <table className="w-full text-left text-[12px]">
                  <tbody className="divide-y divide-[var(--border)] font-[family-name:var(--mono)]">
                    {Object.entries(envInfo).map(([key, value]) => (
                      <tr key={key} className="hover:bg-[var(--bg2)] transition-colors">
                        <td className="w-1/3 px-4 py-2.5 text-[var(--text3)] font-sans font-medium">
                          {key}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--text)] break-all select-all">
                          {key === 'Connection Status' ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className={cn('size-1.5 rounded-full', value === 'Connected' ? 'bg-[var(--green)] pulse-dot' : 'bg-[var(--amber)]')} />
                              {value}
                            </span>
                          ) : (
                            value
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Raw Payload Content */}
          {activeTab === 'raw' && (
            <div className="p-4 sm:p-5 overflow-auto max-h-[360px]">
              <pre className="font-[family-name:var(--mono)] text-[12px] leading-relaxed text-[var(--text2)] bg-[var(--bg1)] p-4 rounded-[var(--radius)] border border-[var(--border)] overflow-auto select-all">
                {JSON.stringify(
                  {
                    incidentId: parsed.incidentId,
                    timestamp: parsed.timestamp,
                    error: {
                      name: parsed.name,
                      message: parsed.message,
                      statusCode: parsed.statusCode,
                      category: parsed.category,
                      stack: parsed.stack,
                    },
                    aiDiagnosis,
                    environment: envInfo,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Navigation Seam */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-[var(--text3)] border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span>Sentinel Telemetry v2</span>
            <span>•</span>
            <span>Status: Incident Contained</span>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/projects" className="hover:text-[var(--text)] transition-colors inline-flex items-center gap-1">
              Switch Project
            </Link>
            <span>•</span>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="hover:text-[var(--text)] transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="size-3" />
              <span>Back to previous page</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export function AppErrorBoundary({
  children,
  fallback,
  onError,
  resetKeys,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  resetKeys?: unknown[];
}) {
  return (
    <ErrorBoundary
      FallbackComponent={fallback ? () => <>{fallback}</> : AppErrorFallback}
      onError={onError}
      resetKeys={resetKeys}
    >
      {children}
    </ErrorBoundary>
  );
}

export function RouteErrorBoundary() {
  const error = useRouteError();

  // 404 → show animated 404 page, not the incident diagnostic
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }

  if (isMissingProjectShellError(error)) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <AppErrorFallback
      error={error}
      resetErrorBoundary={() => window.location.reload()}
      isRootRoute={true}
    />
  );
}
