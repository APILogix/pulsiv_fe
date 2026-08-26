/**
 * AI module — frontend contracts.
 *
 * These mirror the backend AI response shapes so pages can render structured
 * output without `any` access. The backend is the source of truth; this is a
 * read-shape for the UI. No business logic lives here.
 */

// ── Investigation resources (canonical reference model) ──
// The user provides only resource + publicId. The backend resolves all context.
export type InvestigationResource = "error" | "trace" | "request" | "logs";
export type InvestigationKind = InvestigationResource | "log" | "span" | "stack_trace" | "deployment";

export type AiResponseStatus =
  | "SUCCESS"
  | "PARTIAL"
  | "FAILED"
  | "LOCKED"
  | "RATE_LIMITED"
  | "SAFETY_BLOCKED"
  | "INSUFFICIENT_CREDITS"
  | "PROVIDER_ERROR"
  | "INVALID_REQUEST";

export interface EvidenceItem {
  type: string;
  source: string;
  identifier: string;
  excerpt_or_summary: string;
  relevance: number;
  trust_level: string;
}

export interface LikelyCause {
  rank: number;
  cause: string;
  category: string;
  confidence: number;
  evidence: EvidenceItem[];
  reasoning: string;
  recommended_action: string;
}

export interface Citation {
  source_type: string;
  source_id: string;
  title: string;
  url_or_reference: string;
  access_level: string;
  why_cited: string;
}

export interface CreditAction {
  billable: boolean;
  amount: number;
  reason: string;
  status: AiResponseStatus;
  cached: boolean;
  refunded: boolean;
}

/** Structured analysis answer returned by the investigation endpoints. */
export interface AiAnswer {
  status: AiResponseStatus;
  ai_mode: string;
  request_id: string;
  plain_language_summary: string;
  business_impact: string;
  technical_analysis: string;
  likely_causes: LikelyCause[];
  evidence: EvidenceItem[];
  confidence_score: number;
  suggested_fixes: string[];
  verification_steps: string[];
  prevention_recommendations: string[];
  missing_data: string[];
  citations: Citation[];
  safety_warnings: string[];
  credit_action?: CreditAction;
  metadata?: Record<string, unknown>;
}

/** Canonical investigation request input: user provides only resource + publicId. */
export interface InvestigationInput {
  resource: InvestigationResource;
  publicId: string;
  user_query?: string;
  service_name?: string;
  environment_name?: string;
  severity?: string;
  exception_type?: string;
  exception_message?: string;
  stack_trace?: string;
  error_payload?: Record<string, unknown>;
  logs?: unknown[];
  trace?: Record<string, unknown>;
  spans?: unknown[];
  deployment_events?: unknown[];
}

// ── Assistant (grounded monitoring chat) ──
export interface ChatCitation {
  marker: string;
  source_id: string;
  source_type: string;
  title: string;
  reference: string;
  observed_at: string | null;
}

export interface ChatResponse {
  status: "SUCCESS" | "UNGROUNDED" | "LOCKED";
  request_id: string;
  conversation_id: string;
  answer: string;
  citations: ChatCitation[];
  suggested_next_steps: string[];
  tools_used: string[];
  cached: boolean;
}

export interface ChatRequest {
  question: string;
  conversation_id?: string;
  project_id?: string;
  from?: string;
  to?: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  status?: ChatResponse["status"];
  citations?: ChatCitation[];
  suggestions?: string[];
  pending?: boolean;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

// ── Reports (async jobs) ──
export type ReportKind = "weekly" | "incident" | "executive";

export type AiJobStatus =
  | "queued"
  | "processing"
  | "running"
  | "succeeded"
  | "completed"
  | "failed"
  | "cancelled";

export interface AiJob {
  jobId?: string;
  id?: string;
  status: AiJobStatus | string;
  mode?: string;
  createdAt?: string;
  completedAt?: string | null;
  result?: AiAnswer | null;
  answer?: AiAnswer | null;
  error?: string | null;
}

export interface CreatedJob {
  jobId: string;
  status: string;
  idempotentReplay: boolean;
  creditsCharged: number;
}

/** A report entry tracked client-side (the backend exposes job status by id,
 *  not a list endpoint, so history is kept locally per organization). */
export interface ReportRecord {
  jobId: string;
  kind: ReportKind;
  title: string;
  createdAt: number;
  orgId: string;
}

// ── Knowledge ──
export type KnowledgeType = "document" | "runbook" | "documentation";

export interface KnowledgeDoc {
  id: string;
  title: string;
  type: KnowledgeType;
  reference?: string;
  version?: number;
  accessLevel?: string;
  updatedAt?: string;
  sizeBytes?: number;
}

// ── Settings ──
export interface AiFeatureToggle {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface AiOrgSettings {
  enabled: boolean;
  features: AiFeatureToggle[];
  allowedProjectIds: string[];
  allowedUserIds: string[];
  monthlyCreditBudget: number | null;
  perUserDailyLimit: number | null;
  notifyOnBudgetThreshold: boolean;
  budgetThresholdPercent: number;
}

// ── Usage (from billing) ──
export interface AiCreditUsage {
  used: number;
  limit: number;
  remaining: number;
}
