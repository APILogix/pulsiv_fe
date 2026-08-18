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
