/**
 * Workflow step presets — Phase 4.
 *
 * Canonical copy for every multi-step CRUD workflow, kept in one place so the
 * same operation always narrates itself the same way. Each label describes work
 * the backend genuinely performs; we never invent steps to pad the animation.
 */

export interface WorkflowStepDef {
  id: string;
  label: string;
  /** Optional past-tense label shown once the step completes. */
  doneLabel?: string;
}

export const ORGANIZATION_WORKFLOW: readonly WorkflowStepDef[] = [
  { id: "workspace", label: "Creating workspace", doneLabel: "Workspace created" },
  { id: "resources", label: "Provisioning resources", doneLabel: "Resources provisioned" },
  { id: "permissions", label: "Configuring permissions", doneLabel: "Permissions configured" },
  { id: "keys", label: "Creating API keys", doneLabel: "API keys created" },
  { id: "dashboard", label: "Preparing dashboard", doneLabel: "Dashboard ready" },
  { id: "finalize", label: "Finalizing setup", doneLabel: "Setup complete" },
] as const;

export const PROJECT_WORKFLOW: readonly WorkflowStepDef[] = [
  { id: "project", label: "Creating project", doneLabel: "Project created" },
  { id: "environment", label: "Generating environment", doneLabel: "Environment generated" },
  { id: "sdk", label: "Creating SDK config", doneLabel: "SDK config created" },
  { id: "monitoring", label: "Preparing monitoring", doneLabel: "Monitoring ready" },
  { id: "key", label: "Generating API key", doneLabel: "API key generated" },
] as const;

export const CONNECTOR_WORKFLOW: readonly WorkflowStepDef[] = [
  { id: "connect", label: "Connecting provider", doneLabel: "Provider connected" },
  { id: "verify", label: "Verifying credentials", doneLabel: "Credentials verified" },
  { id: "webhook", label: "Creating webhook", doneLabel: "Webhook created" },
  { id: "save", label: "Saving configuration", doneLabel: "Configuration saved" },
] as const;

export const API_KEY_WORKFLOW: readonly WorkflowStepDef[] = [
  { id: "generate", label: "Generating secure key", doneLabel: "Secure key generated" },
  { id: "encrypt", label: "Encrypting", doneLabel: "Encrypted" },
  { id: "save", label: "Saving", doneLabel: "Saved" },
] as const;

export const ALERT_RULE_WORKFLOW: readonly WorkflowStepDef[] = [
  { id: "rules", label: "Creating rules", doneLabel: "Rules created" },
  { id: "conditions", label: "Validating conditions", doneLabel: "Conditions validated" },
  { id: "channels", label: "Preparing notification channels", doneLabel: "Channels ready" },
] as const;

export const INVITE_MEMBER_WORKFLOW: readonly WorkflowStepDef[] = [
  { id: "invite", label: "Sending invite", doneLabel: "Invite sent" },
  { id: "access", label: "Creating access", doneLabel: "Access created" },
  { id: "permissions", label: "Syncing permissions", doneLabel: "Permissions synced" },
] as const;

export const BILLING_WORKFLOW: readonly WorkflowStepDef[] = [
  { id: "checkout", label: "Generating checkout", doneLabel: "Checkout generated" },
  { id: "stripe", label: "Connecting Stripe", doneLabel: "Stripe connected" },
  { id: "subscription", label: "Preparing subscription", doneLabel: "Subscription ready" },
] as const;

export const ENVIRONMENT_WORKFLOW: readonly WorkflowStepDef[] = [
  { id: "environment", label: "Creating environment", doneLabel: "Environment created" },
  { id: "ingest", label: "Provisioning ingest endpoint", doneLabel: "Ingest endpoint ready" },
  { id: "key", label: "Issuing environment key", doneLabel: "Environment key issued" },
] as const;

export const WEBHOOK_WORKFLOW: readonly WorkflowStepDef[] = [
  { id: "endpoint", label: "Registering endpoint", doneLabel: "Endpoint registered" },
  { id: "secret", label: "Generating signing secret", doneLabel: "Signing secret generated" },
  { id: "ping", label: "Sending test delivery", doneLabel: "Test delivery sent" },
] as const;

export const DOMAIN_WORKFLOW: readonly WorkflowStepDef[] = [
  { id: "record", label: "Creating verification record", doneLabel: "Record created" },
  { id: "dns", label: "Checking DNS propagation", doneLabel: "DNS resolved" },
  { id: "verify", label: "Verifying ownership", doneLabel: "Ownership verified" },
] as const;

/** Generic save flow for forms that genuinely round-trip more than one call. */
export const SAVE_WORKFLOW: readonly WorkflowStepDef[] = [
  { id: "validate", label: "Validating changes", doneLabel: "Changes validated" },
  { id: "save", label: "Saving", doneLabel: "Saved" },
  { id: "apply", label: "Applying configuration", doneLabel: "Configuration applied" },
] as const;
