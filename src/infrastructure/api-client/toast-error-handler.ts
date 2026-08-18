import { toast } from 'sonner';
import { ApiError } from './api-error';

// Track recently presented errors by request ID / error hash to prevent duplicate toasts
const recentToasts = new Set<string>();

function getToastKey(error: ApiError): string {
  if (error.requestId) return error.requestId;
  return `${error.status}:${error.code}:${error.message}`;
}

export function presentApiErrorToast(error: ApiError): void {
  const key = getToastKey(error);
  if (recentToasts.has(key)) return;

  recentToasts.add(key);
  setTimeout(() => {
    recentToasts.delete(key);
  }, 3000);

  // Default safe messages per status code
  let displayMessage = error.message;

  if (error.status === 401) {
    displayMessage = error.message || 'Your session has expired. Please sign in again.';
  } else if (error.status === 403) {
    displayMessage = error.message || 'You do not have permission to perform this action.';
  } else if (error.status === 404) {
    displayMessage = error.message || 'The requested resource was not found.';
  } else if (error.status === 409) {
    displayMessage = error.message || 'A conflict occurred with an existing resource.';
  } else if (error.status === 429) {
    displayMessage = error.message || 'You have reached your request or plan quota limit.';
  } else if (error.status >= 500) {
    displayMessage = 'Something went wrong on our server. Please try again.';
  }

  toast.error(displayMessage, {
    description: error.requestId ? `Request ID: ${error.requestId.slice(0, 16)}...` : undefined,
  });
}
