import { AxiosError } from "axios";

export interface NormalizedAiError {
  status: number | null;
  code: string | null;
  message: string;
  /** True when the backend does not expose this capability (404 / 501). */
  unavailable: boolean;
  /** True when the org's plan does not include the capability (403 LOCKED). */
  locked: boolean;
  /** True when the org is out of AI credits (402). */
  outOfCredits: boolean;
  rateLimited: boolean;
}

const FRIENDLY: Record<string, string> = {
  LOCKED: "This AI capability isn't included in your current plan.",
  INSUFFICIENT_CREDITS: "Your organization is out of AI credits for this cycle.",
  SAFETY_BLOCKED: "The request was blocked by AI safety policy.",
  INVALID_REQUEST: "The request was missing required context.",
  TOO_MANY_JOBS: "Too many AI jobs are already running. Try again shortly.",
  TOO_MANY_CHAT_REQUESTS: "Too many chat requests in progress. Try again shortly.",
  PROVIDER_ERROR: "The AI provider is temporarily unavailable.",
};

export function normalizeAiError(error: unknown): NormalizedAiError {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? null;
    const payload = error.response?.data as
      | { error?: { code?: string; message?: string } }
      | undefined;
    const code = payload?.error?.code ?? null;
    const serverMessage = payload?.error?.message;
    return {
      status,
      code,
      message:
        (code && FRIENDLY[code]) ??
        serverMessage ??
        (status === 404 || status === 501
          ? "This capability isn't available yet."
          : "Something went wrong talking to the AI service."),
      unavailable: status === 404 || status === 501,
      locked: status === 403 || code === "LOCKED",
      outOfCredits: status === 402 || code === "INSUFFICIENT_CREDITS",
      rateLimited: status === 429,
    };
  }
  return {
    status: null,
    code: null,
    message: error instanceof Error ? error.message : "Unexpected error",
    unavailable: false,
    locked: false,
    outOfCredits: false,
    rateLimited: false,
  };
}
