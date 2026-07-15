import type { AxiosInstance } from 'axios';
import { authInterceptor } from './auth.interceptor';
import { createErrorInterceptor } from './error.interceptor';
import { createRetryInterceptor } from './retry.interceptor';
import { attachRefreshInterceptor } from './refresh.interceptor';

export function setupInterceptors(client: AxiosInstance) {
  // Request: attach Bearer token
  client.interceptors.request.use(authInterceptor);

  // Response: refresh on 401, then error handling, then retry logic
  attachRefreshInterceptor(client);
  client.interceptors.response.use((res) => res, createErrorInterceptor(client));
  client.interceptors.response.use((res) => res, createRetryInterceptor(client));
}
