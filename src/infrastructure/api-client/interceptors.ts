import type { AxiosInstance, AxiosResponse } from 'axios';
import { authInterceptor } from './auth.interceptor';
import { createErrorInterceptor } from './error.interceptor';
import { createRetryInterceptor } from './retry.interceptor';
import { attachRefreshInterceptor } from './refresh.interceptor';

export function setupInterceptors(client: AxiosInstance) {
  // Request: attach Bearer token
  client.interceptors.request.use(authInterceptor);

  // Response: 1) refresh on 401, 2) retry on 5xx/network dropouts, 3) unwrap & toast errors
  attachRefreshInterceptor(client);

  client.interceptors.response.use((res) => res, createRetryInterceptor(client));

  // Response unwrapping interceptor for canonical success envelopes + error toast
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // If response body is a canonical success envelope, attach data directly
      if (response.data && typeof response.data === 'object' && response.data.success === true && 'data' in response.data) {
        // Keep envelope accessible on response.data.envelope if meta or requestId needed
        (response.data as any).envelope = {
          message: response.data.message,
          meta: response.data.meta,
          requestId: response.data.requestId,
        };
      }
      return response;
    },
    createErrorInterceptor(client)
  );
}
