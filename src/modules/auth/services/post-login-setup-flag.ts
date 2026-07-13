export const POST_LOGIN_SETUP_FLAG = "pulsiv:post-login-setup";

export function markPostLoginSetup() {
  try {
    sessionStorage.setItem(POST_LOGIN_SETUP_FLAG, "1");
  } catch {
    /* sessionStorage unavailable — skip the animation */
  }
}
