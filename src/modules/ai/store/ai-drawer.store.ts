import { create } from "zustand";
import type { InvestigationResource } from "../types";

export type AiDrawerMode = "chat" | "investigate";

export interface AiInvestigationContext {
  resourceType: InvestigationResource;
  publicId: string;
  autoRun?: boolean;
}

interface AiDrawerState {
  isOpen: boolean;
  mode: AiDrawerMode;
  context: AiInvestigationContext | null;
  prefilledPrompt?: string;

  open: (options?: {
    mode?: AiDrawerMode;
    context?: AiInvestigationContext | null;
    prompt?: string;
  }) => void;
  openChat: (initialPrompt?: string) => void;
  openInvestigate: (context?: AiInvestigationContext) => void;
  setMode: (mode: AiDrawerMode) => void;
  setContext: (context: AiInvestigationContext | null) => void;
  close: () => void;
  toggle: () => void;
}

export const useAiDrawerStore = create<AiDrawerState>((set) => ({
  isOpen: false,
  mode: "chat",
  context: null,
  prefilledPrompt: undefined,

  open: (options) =>
    set({
      isOpen: true,
      mode: options?.mode ?? "chat",
      context: options?.context ?? null,
      prefilledPrompt: options?.prompt,
    }),

  openChat: (initialPrompt) =>
    set({
      isOpen: true,
      mode: "chat",
      prefilledPrompt: initialPrompt,
    }),

  openInvestigate: (context) =>
    set({
      isOpen: true,
      mode: "investigate",
      context: context ?? null,
    }),

  setMode: (mode) => set({ mode }),

  setContext: (context) => set({ context }),

  close: () => set({ isOpen: false }),

  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
