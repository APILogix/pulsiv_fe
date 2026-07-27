import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ChatMessage, Conversation } from "../types";

/**
 * Assistant conversation history.
 *
 * The backend threads turns by `conversation_id` but exposes no list endpoint,
 * so conversation history is kept client-side (per browser) and re-hydrated
 * across sessions. Each stored conversation still carries the server-issued
 * `conversation_id` as its `id`, so follow-up turns stay grounded server-side.
 */
interface AssistantState {
  conversations: Conversation[];
  activeId: string | null;

  setActive: (id: string | null) => void;
  startNew: () => void;
  ensureConversation: (id: string, firstUserContent: string) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateMessage: (conversationId: string, messageId: string, patch: Partial<ChatMessage>) => void;
  renameFromServer: (localId: string, serverId: string) => void;
  deleteConversation: (id: string) => void;
  clearAll: () => void;
}

function titleFrom(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed || "New conversation";
}

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set) => ({
      conversations: [],
      activeId: null,

      setActive: (id) => set({ activeId: id }),

      startNew: () => set({ activeId: null }),

      ensureConversation: (id, firstUserContent) =>
        set((state) => {
          if (state.conversations.some((c) => c.id === id)) return state;
          const now = Date.now();
          const conversation: Conversation = {
            id,
            title: titleFrom(firstUserContent),
            createdAt: now,
            updatedAt: now,
            messages: [],
          };
          return { conversations: [conversation, ...state.conversations], activeId: id };
        }),

      addMessage: (conversationId, message) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [...c.messages, message], updatedAt: Date.now() }
              : c,
          ),
        })),

      updateMessage: (conversationId, messageId, patch) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  updatedAt: Date.now(),
                  messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
                }
              : c,
          ),
        })),

      renameFromServer: (localId, serverId) =>
        set((state) => {
          if (localId === serverId) return state;
          return {
            activeId: state.activeId === localId ? serverId : state.activeId,
            conversations: state.conversations.map((c) =>
              c.id === localId ? { ...c, id: serverId } : c,
            ),
          };
        }),

      deleteConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          activeId: state.activeId === id ? null : state.activeId,
        })),

      clearAll: () => set({ conversations: [], activeId: null }),
    }),
    {
      name: "ai-assistant-conversations",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
