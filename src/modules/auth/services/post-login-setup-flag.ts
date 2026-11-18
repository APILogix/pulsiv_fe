export const ORGANIZATION_SETUP_FLAG = "lynktrace:organization-setup";
export const LOGIN_METRICS_FLAG = "lynktrace:login-metrics";

function markTransition(key: string) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    /* sessionStorage unavailable — skip the one-time transition */
  }
}

export function markOrganizationSetup() {
  markTransition(ORGANIZATION_SETUP_FLAG);
}

export function markLoginMetricsTransition() {
  markTransition(LOGIN_METRICS_FLAG);
}
