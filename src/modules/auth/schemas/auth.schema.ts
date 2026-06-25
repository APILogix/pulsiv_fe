import { z } from 'zod';

export const StrongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
  remember_me: z.boolean().optional(),
  trust_device: z.boolean().optional(),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email().max(255),
  full_name: z.string().min(1).max(255),
  password: StrongPasswordSchema,
  accept_terms: z.boolean({
    required_error: 'You must accept the terms of service',
    invalid_type_error: 'You must accept the terms of service',
  }).refine((v) => v === true, 'You must accept the terms of service'),
  accept_privacy: z.boolean({
    required_error: 'You must accept the privacy policy',
    invalid_type_error: 'You must accept the privacy policy',
  }).refine((v) => v === true, 'You must accept the privacy policy'),
  marketing_consent: z.boolean().optional().default(false),
});
export type RegisterFormData = z.infer<typeof registerSchema>;

export const loginMfaSchema = z.object({
  challenge_id: z.string().min(1).max(64),
  code: z.string().length(6).regex(/^\d{6}$/, 'Code must be 6 digits'),
});
export type LoginMfaFormData = z.infer<typeof loginMfaSchema>;

export const backupCodeLoginSchema = z.object({
  challenge_id: z.string().min(1).max(64),
  code: z
    .string()
    .length(20)
    .regex(/^[a-fA-F0-9]{20}$/, 'Code must be 20 hex characters'),
});
export type BackupCodeLoginFormData = z.infer<typeof backupCodeLoginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(64),
  new_password: StrongPasswordSchema,
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  current_password: z.string().min(1).max(256),
  new_password: StrongPasswordSchema,
  confirm_new_password: z.string(),
}).refine((data) => data.new_password === data.confirm_new_password, {
  message: 'Passwords do not match',
  path: ['confirm_new_password'],
});
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(64),
});
export type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});
export type ResendVerificationFormData = z.infer<typeof resendVerificationSchema>;

export const emailChangeRequestSchema = z.object({
  new_email: z.string().email().max(255),
  current_password: z.string().min(1).max(256),
});
export type EmailChangeRequestFormData = z.infer<typeof emailChangeRequestSchema>;

export const emailChangeConfirmSchema = z.object({
  token: z.string().min(64),
});
export type EmailChangeConfirmFormData = z.infer<typeof emailChangeConfirmSchema>;

export const mfaSetupSchema = z.object({
  type: z.enum(['totp', 'email']),
  device_name: z.string().min(1).max(255),
});
export type MfaSetupFormData = z.infer<typeof mfaSetupSchema>;

export const mfaVerifySetupSchema = z.object({
  device_id: z.string().uuid(),
  code: z.string().length(6).regex(/^\d{6}$/),
});
export type MfaVerifySetupFormData = z.infer<typeof mfaVerifySetupSchema>;

export const mfaVerifyStepUpSchema = z.object({
  challenge_id: z.string().min(1).max(64),
  code: z.string().length(6).regex(/^\d{6}$/),
});
export type MfaVerifyStepUpFormData = z.infer<typeof mfaVerifyStepUpSchema>;

export const mfaVerifySetupOrStepUpSchema = z.union([
  z.object({ device_id: z.string().uuid(), code: z.string() }),
  z.object({ challenge_id: z.string(), code: z.string() }),
]);

export const mfaToggleSchema = z.object({
  enabled: z.literal(true),
  mfa_code: z.string().length(6).regex(/^\d{6}$/),
});
export type MfaToggleFormData = z.infer<typeof mfaToggleSchema>;

export const mfaDisableRequestSchema = z.object({
  mfa_code: z.string().length(6).regex(/^\d{6}$/),
});
export type MfaDisableRequestFormData = z.infer<typeof mfaDisableRequestSchema>;

export const mfaDisableConfirmSchema = z.object({
  token: z.string().min(64),
});
export type MfaDisableConfirmFormData = z.infer<typeof mfaDisableConfirmSchema>;

export const mfaDeviceRenameSchema = z.object({
  device_name: z.string().min(1).max(255),
});
export type MfaDeviceRenameFormData = z.infer<typeof mfaDeviceRenameSchema>;

export const regenerateBackupCodesSchema = z.object({
  mfa_code: z.string().length(6).regex(/^\d{6}$/),
});
export type RegenerateBackupCodesFormData = z.infer<typeof regenerateBackupCodesSchema>;

export const accountUnlockRequestSchema = z.object({
  email: z.string().email(),
});
export type AccountUnlockRequestFormData = z.infer<typeof accountUnlockRequestSchema>;

export const accountUnlockConfirmSchema = z.object({
  token: z.string().min(64),
});
export type AccountUnlockConfirmFormData = z.infer<typeof accountUnlockConfirmSchema>;

export const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  avatar_url: z.union([z.string().url().max(2048), z.null()]).optional(),
  timezone: z.string().max(50).optional(),
  locale: z.string().max(10).optional(),
  preferred_mfa_method: z.enum(['totp', 'sms', 'email', 'hardware_key', 'backup_codes']).optional(),
});
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

export const deleteAccountSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type DeleteAccountFormData = z.infer<typeof deleteAccountSchema>;

export const mfaRecoveryRequestSchema = z.object({
  reason: z.string().min(20).max(1000),
});
export type MfaRecoveryRequestFormData = z.infer<typeof mfaRecoveryRequestSchema>;

export const ssoLoginSchema = z.object({
  email: z.string().email().optional(),
  provider_id: z.string().uuid().optional(),
  remember_me: z.boolean().optional(),
  device_name: z.string().max(255).optional(),
  device_type: z.string().max(50).optional(),
}).refine((d) => d.email || d.provider_id, {
  message: 'Email or provider_id is required',
});
export type SsoLoginFormData = z.infer<typeof ssoLoginSchema>;

export const listUsersQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended', 'deleted']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().min(1).max(255).optional(),
});
export type ListUsersQueryFormData = z.infer<typeof listUsersQuerySchema>;

export const adminLockUserSchema = z.object({
  reason: z.string().min(10).max(500),
});
export type AdminLockUserFormData = z.infer<typeof adminLockUserSchema>;

export const adminForcePasswordResetSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type AdminForcePasswordResetFormData = z.infer<typeof adminForcePasswordResetSchema>;
