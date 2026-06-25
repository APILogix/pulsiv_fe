import type { AxiosInstance } from 'axios';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';
import { retryInterceptor } from './retry.interceptor';
import { attachRefreshInterceptor } from './refresh.interceptor';

export function setupInterceptors(client: AxiosInstance) {
  // Request: attach Bearer token
  client.interceptors.request.use(authInterceptor);

  // Response: refresh on 401, then error handling, then retry logic
  attachRefreshInterceptor(client);
  client.interceptors.response.use((res) => res, errorInterceptor);
  client.interceptors.response.use((res) => res, retryInterceptor);
}
