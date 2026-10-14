/**
 * Canonical Frontend API Error representation.
 * Every API failure in the frontend (regardless of transport) is normalized into this structure.
 */

export interface ValidationFieldErrors {
  fields?: Record<string, string>;
  [key: string]: unknown;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: ValidationFieldErrors | unknown;
  public readonly requestId?: string;
  public readonly isSafeMessage: boolean;
  /**
   * Set when a caller surfaces this error itself (inline message or its own
   * toast) via `apiErrorMessage`. The error interceptor then skips its global
   * toast, so one failure produces one message.
   */
  public handled = false;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    requestId?: string,
    isSafeMessage = true
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.isSafeMessage = isSafeMessage;
  }
}

/**
 * HTTP status of a thrown API failure.
 *
 * Everything that leaves the axios client is an `ApiError` (see
 * error.interceptor.ts), which carries `status` directly and has no axios
 * `response`. Reading `err.response?.status` therefore never matched; use this
 * instead. Raw axios errors (thrown before the interceptor) are still handled.
 */
export function errorStatus(error: unknown): number | undefined {
  if (error instanceof ApiError) return error.status;
  if (error && typeof error === 'object' && 'response' in error) {
    const status = (error as { response?: { status?: unknown } }).response?.status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

/** True when the request never got an HTTP answer (offline, DNS, timeout). */
export function isNetworkFailure(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.code === 'SERVICE_UNAVAILABLE' || error.code === 'UPSTREAM_TIMEOUT';
  }
  if (error && typeof error === 'object') {
    const e = error as { response?: unknown; code?: unknown };
    return !e.response || e.code === 'ERR_NETWORK';
  }
  return false;
}

/**
 * The server's message for a failed API call, for callers that show the error
 * themselves (form error, mutation toast). Marks the error handled so the
 * interceptor's global toast is skipped.
 *
 * Replaces `err.response?.data?.error?.message` / `err.response?.data?.message`,
 * which are always undefined on `ApiError` and silently fell through to a
 * generic fallback while the interceptor showed a second toast.
 */
export function apiErrorMessage(error: unknown): string | undefined {
  if (error instanceof ApiError) {
    error.handled = true;
    return error.message || undefined;
  }
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { message?: unknown; error?: { message?: unknown } } } }).response?.data;
    const message = data?.error?.message ?? data?.message;
    return typeof message === 'string' && message ? message : undefined;
  }
  return undefined;
}
