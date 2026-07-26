export const ORGANIZATION_SETUP_FLAG = "pulsiv:organization-setup";
export const LOGIN_METRICS_FLAG = "pulsiv:login-metrics";

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
