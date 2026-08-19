import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import {
  ArrowUp,
  BookMarked,
  Bot,
  Loader2,
  MessagesSquare,
  Plus,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Timestamp } from "@/shared/observe";
import { Markdown } from "@/modules/ai/components/Markdown";
import { normalizeAiError } from "@/modules/ai/lib/errors";
import { useAssistantChat } from "@/modules/ai/hooks/useAi";
import { useAssistantStore } from "@/modules/ai/store/assistant.store";
import type { ChatCitation, ChatMessage } from "@/modules/ai/types";

const SUGGESTED_PROMPTS = [
  { title: "Anomaly Detection", desc: "Correlate latency spikes with recent deployments", query: "Why did latency increase today?" },
  { title: "Root Cause Analysis", desc: "Isolate recent 5xx error clusters across microservices", query: "What caused the latest error spike?" },
  { title: "Slow Endpoints", desc: "Query P99 and P95 latency outliers across fleet", query: "Show me the top 5 slowest endpoints." },
  { title: "Mesh Health Check", desc: "Audit active pods and failing downstream services", query: "What services are currently degraded or unhealthy?" },
];

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ExecutionProgress() {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = [
    "Correlating telemetry & trace waterfall...",
    "Inspecting exception fingerprints & crash logs...",
    "Evaluating canary & deployment diffs...",
    "Synthesizing autonomous mitigation conclusion...",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 1500);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="flex flex-col gap-2 py-1 font-[family-name:var(--mono)] text-[12px] text-[var(--text-secondary)]">
      <div className="flex items-center gap-2">
        <Loader2 className="size-3.5 animate-spin text-[var(--brand)]" />
        <span className="font-medium text-[var(--text-primary)]">{steps[stepIndex]}</span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)] pl-5">
        <span className={stepIndex >= 0 ? "text-[var(--success)] font-medium" : ""}>✓ Traces</span>
        <span>•</span>
        <span className={stepIndex >= 1 ? "text-[var(--success)] font-medium" : ""}>✓ Logs</span>
        <span>•</span>
        <span className={stepIndex >= 2 ? "text-[var(--success)] font-medium" : ""}>✓ Canary</span>
        <span>•</span>
        <span className={stepIndex >= 3 ? "text-[var(--brand)] font-semibold" : ""}>○ Synthesis</span>
      </div>
    </div>
  );
}

function Citations({ citations }: { citations: ChatCitation[] }) {
  if (citations.length === 0) return null;
  return (
    <div className="mt-3 border-t border-[var(--border-subtle)] pt-3 font-[family-name:var(--mono)]">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)] flex items-center gap-1.5">
        <BookMarked className="size-3" />
        <span>Grounded Telemetry Sources</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {citations.map((c) => (
          <li key={`${c.marker}-${c.source_id}`} className="flex items-start gap-2 text-[11px]">
            <span className="font-semibold text-[var(--brand)]">{c.marker}</span>
            <span className="min-w-0 flex-1 truncate">
              <span className="text-[var(--text-primary)] font-medium">{c.title}</span>
              <span className="ml-1.5 rounded-[3px] bg-[var(--surface-3)] px-1.5 py-0.5 text-[9.5px] uppercase text-[var(--text-tertiary)]">
                {c.source_type}
              </span>
              {c.observed_at && (
                <span className="ml-1.5 text-[var(--text-tertiary)]">
                  · <Timestamp value={c.observed_at} />
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3.5", isUser ? "flex-row-reverse" : "flex-row")}>
      <span
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border",
          isUser
            ? "border-[var(--border-strong)] bg-[var(--surface-3)] text-[var(--text-primary)]"
            : "border-[var(--brand-border)] bg-[var(--brand-muted)] text-[var(--brand)]",
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </span>
      <div
        className={cn(
          "min-w-0 max-w-[85%] rounded-[var(--radius-md)] border px-4 py-3 text-[13px] leading-relaxed",
          isUser
            ? "border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-primary)]"
            : "border-[var(--border-default)] bg-[var(--surface-1)] text-[var(--text-primary)]",
        )}
      >
        {message.pending ? (
          <ExecutionProgress />
        ) : isUser ? (
          <p className="whitespace-pre-wrap font-sans">{message.content}</p>
        ) : (
          <>
            {message.status === "UNGROUNDED" && (
              <div className="mb-2">
                <span className="rounded-[4px] bg-[var(--warning-muted)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] text-[var(--warning)] font-medium">
                  No direct telemetry evidence
                </span>
              </div>
            )}
            {message.status === "LOCKED" && (
              <div className="mb-2">
                <span className="rounded-[4px] bg-[var(--error-muted)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] text-[var(--error)] font-medium">
                  AI rate limit / disabled
                </span>
              </div>
            )}
            <Markdown content={message.content} />
            {message.citations && <Citations citations={message.citations} />}
            {message.error && <p className="mt-2 text-[12px] text-[var(--error)] font-[family-name:var(--mono)]">{message.error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

export default function AiAssistantPage() {
  const chat = useAssistantChat();
  const store = useAssistantStore();
  const location = useLocation();
  const { conversations, activeId } = store;
  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );
  const [draft, setDraft] = useState("");
  const [activeContext, setActiveContext] = useState<{ type: string; id: string } | null>(() => {
    const state = location.state as { contextType?: string; contextId?: string } | null;
    if (state?.contextType && state?.contextId) {
      return { type: state.contextType, id: state.contextId };
    }
    return null;
  });
  const threadRef = useRef<HTMLDivElement>(null);
  const messages = active?.messages ?? [];
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && !m.pending);
  const followUps = lastAssistant?.suggestions ?? [];

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, active?.updatedAt]);

  const send = (question: string) => {
    const text = question.trim();
    if (!text || chat.isPending) return;
    setDraft("");

    const existingId = activeId;
    const convId = existingId ?? uid();
    const userMsg: ChatMessage = { id: uid(), role: "user", content: text, createdAt: Date.now() };
    const pendingId = uid();
    const pendingMsg: ChatMessage = {
      id: pendingId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      pending: true,
    };

    store.ensureConversation(convId, text);
    store.addMessage(convId, userMsg);
    store.addMessage(convId, pendingMsg);

    chat.mutate(
      { question: text, ...(existingId ? { conversation_id: existingId } : {}) },
      {
        onSuccess: (res) => {
          const serverId = res.conversation_id || convId;
          if (serverId !== convId) store.renameFromServer(convId, serverId);
          store.updateMessage(serverId, pendingId, {
            content: res.answer,
            citations: res.citations,
            suggestions: res.suggested_next_steps,
            status: res.status,
            pending: false,
          });
        },
        onError: (err) => {
          store.updateMessage(convId, pendingId, {
            content: "",
            pending: false,
            error: normalizeAiError(err).message,
          });
        },
      },
    );
  };

  useEffect(() => {
    const prefill = (location.state as { prefillQuestion?: string } | null)?.prefillQuestion;
    if (prefill) {
      send(prefill);
      window.history.replaceState({}, "");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(draft);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 font-sans" style={{ height: "calc(100vh - 4.5rem)" }}>
      
      {/* ── 1. Page Command Header ── */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            <span className="inline-block size-1.5 rounded-full bg-[var(--brand)]" />
            <span>AI Operations</span>
            <span>/</span>
            <span className="text-[var(--text-secondary)]">Sentinel Intelligence</span>
          </div>
          <h1 className="mt-0.5 text-[20px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] font-[family-name:var(--display)]">
            Telemetry Copilot & Investigator
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-1)] px-2.5 py-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-secondary)]">
            <span className="size-1.5 rounded-full bg-[var(--success)] animate-pulse" />
            <span>GEMINI 1.5 PRO CORRELATOR</span>
          </div>
          <button
            type="button"
            onClick={() => store.startNew()}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--brand-border)] bg-[var(--brand-muted)] px-3 py-1 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--brand)] hover:text-white transition-all"
          >
            <Plus className="size-3.5" />
            <span>New Investigation</span>
          </button>
        </div>
      </div>

      {/* ── 2. Split Workspace ── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        
        {/* Left: Investigation Sessions */}
        <aside className="hidden min-h-0 flex-col rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] lg:flex overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-3.5 py-2.5 bg-[var(--surface-2)]/30">
            <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-medium">
              Past Threads ({conversations.length})
            </span>
          </div>
          
          <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-[12px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
                No active investigations.
              </div>
            ) : (
              <ul className="flex flex-col gap-1">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => store.setActive(c.id)}
                      className={cn(
                        "group flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-[12px] transition-colors",
                        c.id === activeId
                          ? "bg-[var(--surface-3)] text-[var(--text-primary)] font-medium border border-[var(--border-subtle)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
                      )}
                    >
                      <MessagesSquare className="size-3.5 shrink-0 text-[var(--text-tertiary)]" />
                      <span className="min-w-0 flex-1 truncate font-[family-name:var(--mono)]">{c.title}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          store.deleteConversation(c.id);
                        }}
                        className="opacity-0 transition-opacity hover:text-[var(--error)] group-hover:opacity-100 p-0.5"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="size-3.5" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Right: Active Workbench */}
        <section className="flex min-h-0 flex-col rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-0)] overflow-hidden">
          
          {/* Scrollable Conversation Stream */}
          <div ref={threadRef} className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-6 py-8 text-center max-w-2xl mx-auto">
                <div className="flex size-12 items-center justify-center rounded-[var(--radius-md)] border border-[var(--brand-border)] bg-[var(--brand-muted)] text-[var(--brand)]">
                  <Sparkles className="size-6" />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-[var(--text-primary)] font-[family-name:var(--display)]">
                    Observability Intelligence Assistant
                  </h3>
                  <p className="mt-1 text-[13px] text-[var(--text-secondary)] leading-relaxed">
                    Ask questions across logs, latency traces, error groups, and canary deployments. Every hypothesis is mathematically grounded in raw telemetry.
                  </p>
                </div>

                <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 text-left">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p.title}
                      type="button"
                      onClick={() => send(p.query)}
                      className="group rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-1)] p-3 transition-all hover:border-[var(--brand-border)] hover:bg-[var(--surface-2)]"
                    >
                      <div className="text-[12px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] flex items-center justify-between font-[family-name:var(--display)]">
                        <span>{p.title}</span>
                        <ArrowUp className="size-3 rotate-45 text-[var(--text-tertiary)] group-hover:text-[var(--brand)]" />
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--text-secondary)] leading-snug">
                        {p.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-w-3xl mx-auto">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
              </div>
            )}
          </div>

          {/* Follow-up Suggestion Chips */}
          {followUps.length > 0 && !chat.isPending && (
            <div className="flex flex-wrap gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-1)]/40 px-4 py-2">
              <span className="text-[10.5px] font-[family-name:var(--mono)] uppercase tracking-wider text-[var(--text-tertiary)] mr-1 self-center">
                Suggested Next:
              </span>
              {followUps.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => send(f)}
                  className="rounded-[4px] border border-[var(--border-default)] bg-[var(--surface-2)] px-2.5 py-1 text-[11.5px] text-[var(--text-secondary)] hover:border-[var(--brand-border)] hover:text-[var(--brand)] transition-colors font-[family-name:var(--mono)]"
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          {/* Composer Box */}
          <form onSubmit={handleSubmit} className="border-t border-[var(--border-default)] bg-[var(--surface-1)] p-3.5 space-y-2 shrink-0">
            {activeContext && (
              <div className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--brand-border)] bg-[var(--brand-muted)] px-3 py-1.5 text-[12px] font-[family-name:var(--mono)]">
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <span className="text-[10px] uppercase font-semibold text-[var(--brand)]">Locked Telemetry Context:</span>
                  <span className="font-semibold">{activeContext.type}:</span>
                  <span className="text-[var(--text-secondary)]">{activeContext.id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveContext(null)}
                  className="rounded p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  aria-label="Remove context"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            <div className="relative flex items-end gap-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] p-2 focus-within:border-[var(--brand)] transition-colors">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={
                  activeContext
                    ? `Ask deep diagnostic questions about ${activeContext.type} ${activeContext.id}…`
                    : "Ask AI to correlate exceptions, inspect waterfall traces, or diagnose bottlenecks…"
                }
                className="max-h-32 min-h-[36px] w-full resize-none bg-transparent px-2 py-1.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none font-[family-name:var(--mono)]"
              />
              <button
                type="submit"
                disabled={!draft.trim() || chat.isPending}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand)] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                aria-label="Send message"
              >
                <ArrowUp className="size-4" />
              </button>
            </div>

            <div className="flex items-center justify-between px-1 text-[10.5px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
              <span>Enter to execute query · Shift+Enter for newline</span>
              <span>Grounding: 100% active tenant telemetry</span>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

