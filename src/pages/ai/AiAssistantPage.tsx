import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import {
  ArrowUp,
  BookMarked,
  Bot,
  MessagesSquare,
  Plus,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHero, Pill, IconChip } from "@/shared/ui/pulse";
import { Timestamp } from "@/shared/observe";
import { Markdown } from "@/modules/ai/components/Markdown";
import { normalizeAiError } from "@/modules/ai/lib/errors";
import { useAssistantChat } from "@/modules/ai/hooks/useAi";
import { useAssistantStore } from "@/modules/ai/store/assistant.store";
import type { ChatCitation, ChatMessage } from "@/modules/ai/types";

const SUGGESTED_PROMPTS = [
  "Which endpoints have the highest error rate in the last 24 hours?",
  "Summarize errors after the most recent deployment.",
  "What is driving p95 latency on the payments service?",
  "Are there any anomalies in traffic over the last hour?",
];

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function Citations({ citations }: { citations: ChatCitation[] }) {
  if (citations.length === 0) return null;
  return (
    <div className="mt-3 border-t border-[var(--border)] pt-3">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)]">
        Sources
      </div>
      <ul className="flex flex-col gap-1.5">
        {citations.map((c) => (
          <li key={`${c.marker}-${c.source_id}`} className="flex items-start gap-2 text-[12px]">
            <span className="font-[family-name:var(--mono)] font-semibold text-[var(--ai)]">{c.marker}</span>
            <BookMarked className="mt-0.5 size-3.5 shrink-0 text-[var(--text3)]" />
            <span className="min-w-0">
              <span className="text-[var(--text)]">{c.title}</span>
              <span className="ml-1.5 rounded-[4px] bg-[var(--bg3)] px-1 py-px text-[10px] uppercase text-[var(--text3)]">
                {c.source_type}
              </span>
              {c.observed_at && (
                <span className="ml-1.5 text-[var(--text3)]">
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

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Assistant is thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-[var(--text3)]"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <span
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] ring-1 ring-inset",
          isUser
            ? "bg-[var(--brand-bg)] text-[var(--brand)] ring-[var(--brand)]/25"
            : "bg-[var(--ai-bg)] text-[var(--ai)] ring-[var(--ai)]/25",
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </span>
      <div
        className={cn(
          "min-w-0 max-w-[85%] rounded-[14px] border px-4 py-3",
          isUser
            ? "border-[var(--brand)]/20 bg-[var(--brand-bg)]"
            : "border-[var(--border)] bg-[var(--bg1)]",
        )}
      >
        {message.pending ? (
          <TypingDots />
        ) : isUser ? (
          <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--text)]">{message.content}</p>
        ) : (
          <>
            {message.status === "UNGROUNDED" && (
              <div className="mb-2">
                <Pill tone="amber">No grounded answer</Pill>
              </div>
            )}
            {message.status === "LOCKED" && (
              <div className="mb-2">
                <Pill tone="red">AI disabled</Pill>
              </div>
            )}
            <Markdown content={message.content} />
            {message.citations && <Citations citations={message.citations} />}
            {message.error && <p className="mt-2 text-[12.5px] text-[var(--red)]">{message.error}</p>}
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

  // "Ask AI" buttons on observe tables navigate here with a prefilled question
  // in router state. Fire it once on arrival, then clear the state so a
  // refresh or back-navigation doesn't resend it.
  useEffect(() => {
    const prefill = (location.state as { prefillQuestion?: string } | null)?.prefillQuestion;
    if (prefill) {
      send(prefill);
      window.history.replaceState({}, "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="flex flex-col gap-4" style={{ height: "calc(100vh - var(--header-height) - 3rem)" }}>
      <PageHero
        eyebrow="Artificial Intelligence"
        title="AI Assistant"
        description="Ask questions in natural language. Answers are grounded in your organization's monitoring data and cite their sources."
        icon={MessagesSquare}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Conversation history */}
        <aside className="hidden min-h-0 flex-col rounded-[14px] border border-[var(--border)] bg-[var(--bg1)] lg:flex">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)]">History</span>
            <button
              type="button"
              onClick={() => store.startNew()}
              className="inline-flex items-center gap-1 rounded-[7px] border border-[var(--border)] px-2 py-1 text-[12px] text-[var(--text2)] transition-colors hover:border-[var(--ai)] hover:text-[var(--ai)]"
            >
              <Plus className="size-3.5" /> New
            </button>
          </div>
          <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <p className="px-2 py-6 text-center text-[12.5px] text-[var(--text3)]">No conversations yet.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => store.setActive(c.id)}
                      className={cn(
                        "group flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13px] transition-colors",
                        c.id === activeId
                          ? "bg-[var(--bg2)] text-[var(--text)]"
                          : "text-[var(--text2)] hover:bg-[var(--bg2)]",
                      )}
                    >
                      <MessagesSquare className="size-3.5 shrink-0 text-[var(--text3)]" />
                      <span className="min-w-0 flex-1 truncate">{c.title}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          store.deleteConversation(c.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            store.deleteConversation(c.id);
                          }
                        }}
                        className="opacity-0 transition-opacity hover:text-[var(--red)] group-hover:opacity-100"
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

        {/* Thread */}
        <section className="flex min-h-0 flex-col rounded-[14px] border border-[var(--border)] bg-[var(--bg)]">
          <div ref={threadRef} className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-5 py-8 text-center">
                <IconChip icon={Sparkles} tone="ai" size="lg" />
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--text)]">Ask about your monitoring data</h3>
                  <p className="mx-auto mt-1 max-w-[46ch] text-[13px] text-[var(--text2)]">
                    The Assistant only answers from your organization's telemetry and always cites its sources.
                  </p>
                </div>
                <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => send(p)}
                      className="rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] p-3 text-left text-[12.5px] text-[var(--text2)] transition-colors hover:border-[var(--ai)]/40 hover:text-[var(--text)]"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
              </div>
            )}
          </div>

          {/* Follow-ups */}
          {followUps.length > 0 && !chat.isPending && (
            <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-4 py-2.5">
              {followUps.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => send(f)}
                  className="rounded-full border border-[var(--border)] bg-[var(--bg1)] px-3 py-1 text-[12px] text-[var(--text2)] transition-colors hover:border-[var(--ai)] hover:text-[var(--ai)]"
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <form onSubmit={handleSubmit} className="border-t border-[var(--border)] p-3">
            <div className="flex items-end gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-2 focus-within:border-[var(--ai)]">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask about errors, latency, deployments, incidents…"
                className="max-h-40 min-h-[38px] w-full resize-none bg-transparent px-2 py-1.5 text-[13.5px] text-[var(--text)] outline-none placeholder:text-[var(--text3)]"
              />
              <button
                type="submit"
                disabled={!draft.trim() || chat.isPending}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--ai)] text-[var(--ai-fg)] transition-opacity hover:opacity-90 disabled:opacity-40"
                aria-label="Send message"
              >
                <ArrowUp className="size-4" />
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[11px] text-[var(--text3)]">
              Grounded in your monitoring data · Enter to send, Shift+Enter for a new line
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
