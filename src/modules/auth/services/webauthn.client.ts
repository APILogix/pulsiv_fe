/**
 * WebAuthn / passkey ceremony orchestration for the browser.
 *
 * Wraps @simplewebauthn/browser (startRegistration / startAuthentication) and
 * the backend option/verify endpoints exposed through authApi. The backend
 * uses @simplewebauthn/server, so the JSON options it returns are passed
 * straight through as `optionsJSON`.
 *
 * Device type `hardware_key` covers both roaming security keys (YubiKey) and
 * platform authenticators / passkeys (Touch ID, Windows Hello).
 */
import {
  startAuthentication,
  startRegistration,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import { authApi } from '../api/auth.api';
import type { AuthSession } from '../types/auth.types';

export const webauthnSupported = (): boolean => browserSupportsWebAuthn();

/**
 * Thrown when the user cancels or the authenticator ceremony fails. Callers
 * can show `message` directly.
 */
export class WebAuthnCeremonyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebAuthnCeremonyError';
  }
}

function mapCeremonyError(err: unknown): WebAuthnCeremonyError {
  const name = (err as { name?: string })?.name;
  switch (name) {
    case 'NotAllowedError':
      return new WebAuthnCeremonyError(
        'The request was cancelled or timed out. Please try again.',
      );
    case 'InvalidStateError':
      return new WebAuthnCeremonyError(
        'This security key is already registered on your account.',
      );
    case 'NotSupportedError':
      return new WebAuthnCeremonyError(
        'This browser or device does not support security keys.',
      );
    case 'SecurityError':
      return new WebAuthnCeremonyError(
        'A security error occurred. Ensure you are on a secure (HTTPS) connection.',
      );
    default:
      return new WebAuthnCeremonyError(
        (err as Error)?.message || 'Security key verification failed.',
      );
  }
}

/**
 * Enroll a new passkey / security key. Returns the created device id and the
 * one-time backup codes (only present when this is the user's first device).
 * The verify call requires a fresh step-up; the global 403 interceptor handles
 * prompting for it transparently.
 */
export async function enrollPasskey(
  deviceName: string,
): Promise<{ device_id: string; backup_codes?: string[] }> {
  if (!webauthnSupported()) {
    throw new WebAuthnCeremonyError(
      'This browser does not support security keys or passkeys.',
    );
  }
  const { options } = await authApi.webauthnRegisterOptions(deviceName);
  let attResp;
  try {
    attResp = await startRegistration({ optionsJSON: options });
  } catch (err) {
    throw mapCeremonyError(err);
  }
  return authApi.webauthnRegisterVerify({
    device_name: deviceName,
    challenge: options.challenge,
    response: attResp,
  });
}

/** Complete login when the selected MFA device is a passkey / security key. */
export async function loginWithPasskey(challengeId: string): Promise<AuthSession> {
  if (!webauthnSupported()) {
    throw new WebAuthnCeremonyError(
      'This browser does not support security keys or passkeys.',
    );
  }
  const { options } = await authApi.webauthnLoginMfaOptions(challengeId);
  let authResp;
  try {
    authResp = await startAuthentication({ optionsJSON: options });
  } catch (err) {
    throw mapCeremonyError(err);
  }
  return authApi.webauthnLoginMfaVerify({
    challenge_id: challengeId,
    challenge: options.challenge,
    response: authResp,
  });
}

/** Complete a step-up challenge when the device is a passkey / security key. */
export async function stepUpWithPasskey(challengeId: string): Promise<void> {
  if (!webauthnSupported()) {
    throw new WebAuthnCeremonyError(
      'This browser does not support security keys or passkeys.',
    );
  }
  const { options } = await authApi.webauthnStepUpOptions(challengeId);
  let authResp;
  try {
    authResp = await startAuthentication({ optionsJSON: options });
  } catch (err) {
    throw mapCeremonyError(err);
  }
  await authApi.webauthnStepUpVerify({
    challenge_id: challengeId,
    challenge: options.challenge,
    response: authResp,
  });
}
