/**
 * Access-token storage.
 *
 * Only the ACCESS token is held here (short-lived JWT, returned in the response
 * body on login). The refresh token is an httpOnly, signed cookie named
 * `__Host-refresh_token` managed entirely by the browser + backend — we never
 * touch it from JavaScript, so it cannot be exfiltrated by XSS.
 */

const ACCESS_TOKEN_KEY = 'pulse_access_token';
const EXPIRES_AT_KEY = 'pulse_access_token_expires_at';
const CURRENT_ORG_ID_KEY = 'pulse_current_org_id';

class TokenService {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getExpiresAt(): Date | null {
    const raw = localStorage.getItem(EXPIRES_AT_KEY);
    return raw ? new Date(raw) : null;
  }

  setAccessToken(accessToken: string, expiresAt?: Date | string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (expiresAt) {
      localStorage.setItem(
        EXPIRES_AT_KEY,
        typeof expiresAt === 'string' ? expiresAt : expiresAt.toISOString(),
      );
    }
  }

  getCurrentOrgId(): string | null {
    return localStorage.getItem(CURRENT_ORG_ID_KEY);
  }

  setCurrentOrgId(orgId: string | null | undefined): void {
    if (orgId) {
      localStorage.setItem(CURRENT_ORG_ID_KEY, orgId);
    } else {
      localStorage.removeItem(CURRENT_ORG_ID_KEY);
    }
  }

  /**
   * @deprecated use setAccessToken — kept for call sites that still pass a
   * second argument that should now be ignored (refresh is cookie-managed).
   */
  setTokens(accessToken: string, _refreshToken?: string): void {
    this.setAccessToken(accessToken);
  }

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    localStorage.removeItem(CURRENT_ORG_ID_KEY);
  }
}

export const tokenService = new TokenService();
