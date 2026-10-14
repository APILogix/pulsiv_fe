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
const CURRENT_ORG_SLUG_KEY = 'pulse_current_org_slug';
const CURRENT_PROJECT_ID_KEY = 'pulse_current_project_id';
const CURRENT_PROJECT_SLUG_KEY = 'pulse_current_project_slug';

let memoryAccessToken: string | null = null;
let memoryExpiresAt: Date | null = null;

// Clean up legacy localStorage tokens if present to prevent persistence of old tokens
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (window.localStorage.getItem(ACCESS_TOKEN_KEY)) {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(EXPIRES_AT_KEY);
    }
  }
} catch {
  // Ignore storage access errors in restricted contexts
}

class TokenService {
  getAccessToken(): string | null {
    if (memoryAccessToken) return memoryAccessToken;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        memoryAccessToken = window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
        return memoryAccessToken;
      }
    } catch {
      // Storage access blocked or unavailable
    }
    return null;
  }

  getExpiresAt(): Date | null {
    if (memoryExpiresAt) return memoryExpiresAt;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = window.sessionStorage.getItem(EXPIRES_AT_KEY);
        memoryExpiresAt = raw ? new Date(raw) : null;
        return memoryExpiresAt;
      }
    } catch {
      // Storage access blocked
    }
    return null;
  }

  setAccessToken(accessToken: string, expiresAt?: Date | string): void {
    memoryAccessToken = accessToken;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        if (expiresAt) {
          const iso = typeof expiresAt === 'string' ? expiresAt : expiresAt.toISOString();
          memoryExpiresAt = new Date(iso);
          window.sessionStorage.setItem(EXPIRES_AT_KEY, iso);
        }
      }
    } catch {
      // Storage access blocked
    }
  }

  getCurrentOrgId(): string | null {
    try {
      return sessionStorage.getItem(CURRENT_ORG_ID_KEY) || localStorage.getItem(CURRENT_ORG_ID_KEY);
    } catch {
      return null;
    }
  }

  setCurrentOrgId(orgId: string | null | undefined): void {
    try {
      if (orgId) {
        sessionStorage.setItem(CURRENT_ORG_ID_KEY, orgId);
        localStorage.setItem(CURRENT_ORG_ID_KEY, orgId);
      } else {
        sessionStorage.removeItem(CURRENT_ORG_ID_KEY);
        localStorage.removeItem(CURRENT_ORG_ID_KEY);
      }
    } catch {
      // Storage access blocked
    }
  }

  getCurrentOrgSlug(): string | null {
    try {
      return sessionStorage.getItem(CURRENT_ORG_SLUG_KEY) || localStorage.getItem(CURRENT_ORG_SLUG_KEY);
    } catch {
      return null;
    }
  }

  setCurrentOrgSlug(slug: string | null | undefined): void {
    try {
      if (slug) {
        sessionStorage.setItem(CURRENT_ORG_SLUG_KEY, slug);
        localStorage.setItem(CURRENT_ORG_SLUG_KEY, slug);
      } else {
        sessionStorage.removeItem(CURRENT_ORG_SLUG_KEY);
        localStorage.removeItem(CURRENT_ORG_SLUG_KEY);
      }
    } catch {
      // Storage access blocked
    }
  }

  getCurrentProjectId(): string | null {
    try {
      return sessionStorage.getItem(CURRENT_PROJECT_ID_KEY) || localStorage.getItem(CURRENT_PROJECT_ID_KEY);
    } catch {
      return null;
    }
  }

  setCurrentProjectId(projectId: string | null | undefined): void {
    try {
      if (projectId) {
        sessionStorage.setItem(CURRENT_PROJECT_ID_KEY, projectId);
        localStorage.setItem(CURRENT_PROJECT_ID_KEY, projectId);
      } else {
        sessionStorage.removeItem(CURRENT_PROJECT_ID_KEY);
        localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
      }
    } catch {
      // Storage access blocked
    }
  }

  getCurrentProjectSlug(): string | null {
    try {
      return sessionStorage.getItem(CURRENT_PROJECT_SLUG_KEY) || localStorage.getItem(CURRENT_PROJECT_SLUG_KEY);
    } catch {
      return null;
    }
  }

  setCurrentProjectSlug(slug: string | null | undefined): void {
    try {
      if (slug) {
        sessionStorage.setItem(CURRENT_PROJECT_SLUG_KEY, slug);
        localStorage.setItem(CURRENT_PROJECT_SLUG_KEY, slug);
      } else {
        sessionStorage.removeItem(CURRENT_PROJECT_SLUG_KEY);
        localStorage.removeItem(CURRENT_PROJECT_SLUG_KEY);
      }
    } catch {
      // Storage access blocked
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
    memoryAccessToken = null;
    memoryExpiresAt = null;
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(EXPIRES_AT_KEY);
        sessionStorage.removeItem(CURRENT_ORG_ID_KEY);
        sessionStorage.removeItem(CURRENT_ORG_SLUG_KEY);
        sessionStorage.removeItem(CURRENT_PROJECT_ID_KEY);
        sessionStorage.removeItem(CURRENT_PROJECT_SLUG_KEY);

        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(EXPIRES_AT_KEY);
        localStorage.removeItem(CURRENT_ORG_ID_KEY);
        localStorage.removeItem(CURRENT_ORG_SLUG_KEY);
        localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
        localStorage.removeItem(CURRENT_PROJECT_SLUG_KEY);
      }
    } catch {
      // Storage access blocked
    }
  }
}

export const tokenService = new TokenService();
