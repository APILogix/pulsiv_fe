import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  BookMarked,
  Bot,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Timestamp } from "@/shared/observe";
import { Markdown } from "./Markdown";
import { normalizeAiError } from "../lib/errors";
import { useAssistantChat } from "../hooks/useAi";
import { useAssistantStore } from "../store/assistant.store";
import { useAiDrawerStore } from "../store/ai-drawer.store";
import type { ChatCitation, ChatMessage } from "../types";

const SUGGESTED_PROMPTS = [
  "Why did error rate increase today?",
  "Show me the slowest requests on production.",
  "Explain what changed after the latest release.",
  "Which endpoints have the highest failure rates?",
];

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function Citations({ citations }: { citations: ChatCitation[] }) {
  if (!citations || citations.length === 0) return null;
  return (
    <div className="mt-3 border-t border-[var(--border)] pt-2.5">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)]">
        Grounded Citations
      </div>
      <ul className="flex flex-col gap-1.5">
        {citations.map((c) => (
          <li key={`${c.marker}-${c.source_id}`} className="flex items-start gap-2 text-[11.5px]">
            <span className="font-[family-name:var(--mono)] font-semibold text-[var(--ai)]">{c.marker}</span>
            <BookMarked className="mt-0.5 size-3 shrink-0 text-[var(--text3)]" />
            <span className="min-w-0">
              <span className="text-[var(--text)]">{c.title}</span>
              <span className="ml-1.5 rounded-[4px] bg-[var(--bg3)] px-1 py-px text-[9.5px] uppercase text-[var(--text3)]">
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

export function AiDrawerChat() {
  const chatMutation = useAssistantChat();
  const prefilledPrompt = useAiDrawerStore((s) => s.prefilledPrompt);

  const {
    conversations,
    activeId,
    startNew,
    ensureConversation,
    addMessage,
    updateMessage,
    renameFromServer,
    deleteConversation,
  } = useAssistantStore();

  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const messages = activeConversation?.messages ?? [];

  // Scroll to bottom when messages update
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, chatMutation.isPending]);

  // Handle prefilled prompt
  useEffect(() => {
    if (prefilledPrompt) {
      setInput(prefilledPrompt);
      inputRef.current?.focus();
    }
  }, [prefilledPrompt]);

  const handleSend = (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || chatMutation.isPending) return;

    setInput("");

    const targetConvId = activeConversation?.id ?? uid();
    ensureConversation(targetConvId, question);

    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      content: question,
      createdAt: Date.now(),
    };
    addMessage(targetConvId, userMessage);

    const assistantPlaceholderId = uid();
    const assistantPlaceholder: ChatMessage = {
      id: assistantPlaceholderId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      pending: true,
    };
    addMessage(targetConvId, assistantPlaceholder);

    chatMutation.mutate(
      {
        question,
        conversation_id: activeConversation?.id ? activeConversation.id : undefined,
      },
      {
        onSuccess: (res) => {
          if (res.conversation_id && res.conversation_id !== targetConvId) {
            renameFromServer(targetConvId, res.conversation_id);
          }
          updateMessage(res.conversation_id ?? targetConvId, assistantPlaceholderId, {
            content: res.answer,
            status: res.status,
            citations: res.citations,
            suggestions: res.suggested_next_steps,
            pending: false,
          });
        },
        onError: (err) => {
          const norm = normalizeAiError(err);
          updateMessage(targetConvId, assistantPlaceholderId, {
            content: norm.message,
            error: norm.message,
            pending: false,
          });
        },
      },
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top action bar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2 bg-[var(--bg1)]/60 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-[var(--text2)] truncate max-w-[240px]">
            {activeConversation?.title || "New Chat"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg2)] px-2 py-1 text-[11px] font-medium text-[var(--text2)] transition-colors hover:bg-[var(--bg3)] hover:text-[var(--text)]"
            title="Start new conversation"
          >
            <Plus className="size-3" />
            New Chat
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => activeId && deleteConversation(activeId)}
              className="inline-flex items-center p-1 text-[var(--text3)] rounded hover:bg-[var(--bg2)] hover:text-[var(--red)] transition-colors"
              title="Delete conversation"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-12 text-center my-auto">
            <div className="flex size-12 items-center justify-center rounded-full bg-[var(--ai-bg)] text-[var(--ai)] shadow-sm">
              <Sparkles className="size-6" />
            </div>
            <div className="flex flex-col gap-1 max-w-[340px]">
              <h3 className="text-[14px] font-semibold text-[var(--text)]">AI Monitoring Assistant</h3>
              <p className="text-[12px] text-[var(--text3)] leading-relaxed">
                Ask grounded questions about error rates, trace latencies, service dependencies, or anomalies across your telemetry.
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full max-w-[620px] mt-3">
              <span className="text-[11px] font-semibold text-[var(--text3)] uppercase tracking-wider text-left">Suggested queries</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg1)] px-3.5 py-2.5 text-left text-[12px] text-[var(--text2)] transition-all hover:border-[var(--ai)]/50 hover:bg-[var(--ai-bg)]/20 hover:text-[var(--text)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={cn(
                  "flex gap-3 text-[13px]",
                  isUser ? "justify-end" : "justify-start"
                )}
              >
                {!isUser && (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--ai-bg)] text-[var(--ai)] mt-1">
                    <Bot className="size-3.5" />
                  </span>
                )}

                <div
                  className={cn(
                    "max-w-[85%] rounded-[var(--radius-lg)] p-3.5 leading-relaxed shadow-sm",
                    isUser
                      ? "bg-[var(--brand)] text-white font-medium"
                      : "border border-[var(--border)] bg-[var(--bg1)] text-[var(--text)]"
                  )}
                >
                  {m.pending ? (
                    <div className="flex items-center gap-2 text-[12px] text-[var(--text3)]">
                      <Loader2 className="size-3.5 animate-spin text-[var(--ai)]" />
                      Analyzing telemetry & citing sources…
                    </div>
                  ) : isUser ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <>
                      <Markdown content={m.content} />
                      {m.citations && <Citations citations={m.citations} />}
                      {m.suggestions && m.suggestions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-2.5">
                          {m.suggestions.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => handleSend(s)}
                              className="rounded-full border border-[var(--ai)]/30 bg-[var(--ai-bg)] px-2.5 py-1 text-[11px] text-[var(--ai)] transition-colors hover:bg-[var(--ai-bg)]/50"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {isUser && (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg3)] text-[var(--text2)] mt-1">
                    <User className="size-3.5" />
                  </span>
                )}
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[var(--border)] bg-[var(--bg1)] p-3 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2 rounded-[var(--radius-lg)] border border-[var(--border2)] bg-[var(--bg)] p-2 focus-within:border-[var(--ai)] focus-within:ring-1 focus-within:ring-[var(--ai)]"
        >
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask AI anything about your telemetry..."
            className="flex-1 resize-none bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text3)]"
          />
          <button
            type="submit"
            disabled={!input.trim() || chatMutation.isPending}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--ai)] text-[#032a33] font-semibold transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {chatMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </button>
        </form>
        <p className="mt-1.5 text-center text-[10.5px] text-[var(--text3)]">
          Pulse AI is grounded in real-time telemetry from your active project.
        </p>
      </div>
    </div>
  );
}
