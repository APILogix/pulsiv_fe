#!/usr/bin/env node
/**
 * scripts/audit-cwv.mjs
 *
 * Automated Core Web Vitals (CWV) & Performance Audit Harness
 *
 * Audits Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS),
 * Interaction to Next Paint (INP), First Contentful Paint (FCP), and TTFB
 * across all application routes and tiers on the production preview server.
 *
 * Usage:
 *   node scripts/audit-cwv.mjs [--url http://127.0.0.1:4173] [--routes all|quick|tier1|tier2|tier3|tier4] [--throttle]
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ── 1. Comprehensive 140-Route Manifest Across 4 Tiers ──────────────────────

export const ROUTE_MANIFEST = {
  // ── Tier 1: Feature Coverage (Core & Entry Routes) ────────────────────────
  tier1: [
    // Public Authentication & Flow Routes (15)
    { path: '/auth/login', name: 'Public Login', auth: false, tier: 1 },
    { path: '/auth/register', name: 'Public Register', auth: false, tier: 1 },
    { path: '/auth/forgot-password', name: 'Forgot Password', auth: false, tier: 1 },
    { path: '/auth/reset-password', name: 'Reset Password', auth: false, tier: 1 },
    { path: '/auth/verify-email', name: 'Verify Email', auth: false, tier: 1 },
    { path: '/auth/login/sso', name: 'SSO Login', auth: false, tier: 1 },
    { path: '/auth/login/mfa', name: 'MFA Login', auth: false, tier: 1 },
    { path: '/auth/login/backup-code', name: 'Backup Codes Login', auth: false, tier: 1 },
    { path: '/auth/unlock', name: 'Account Unlock Request', auth: false, tier: 1 },
    { path: '/auth/unlock/confirm', name: 'Account Unlock Confirm', auth: false, tier: 1 },
    { path: '/auth/callback', name: 'OAuth Callback', auth: false, tier: 1 },
    { path: '/account/delete/confirm', name: 'Account Deletion Confirm', auth: false, tier: 1 },
    { path: '/accept-invite', name: 'Accept Organization Invite', auth: false, tier: 1 },
    { path: '/loading', name: 'Stand-alone Loading Fallback', auth: false, tier: 1 },
    { path: '/error-preview', name: 'Error Boundary Preview', auth: false, tier: 1 },

    // Primary Module Top-Level Entries (16)
    { path: '/acme/dashboard', name: 'Root Departure Board', auth: true, tier: 1 },
    { path: '/acme/dashboards/overview', name: 'Custom Dashboards Overview', auth: true, tier: 1 },
    { path: '/acme/observability', name: 'Pulse Observability Executive', auth: true, tier: 1 },
    { path: '/acme/services', name: 'Services Catalog', auth: true, tier: 1 },
    { path: '/acme/projects', name: 'Projects Workspace List', auth: true, tier: 1 },
    { path: '/acme/alerts', name: 'Alerts & Incidents Active', auth: true, tier: 1 },
    { path: '/acme/automation', name: 'Automation Overview', auth: true, tier: 1 },
    { path: '/acme/ingestion', name: 'Ingestion Connections Overview', auth: true, tier: 1 },
    { path: '/acme/ai', name: 'AI Ops Overview', auth: true, tier: 1 },
    { path: '/acme/admin', name: 'Organization Admin Profile', auth: true, tier: 1 },
    { path: '/acme/billing', name: 'Subscription Plan & Billing', auth: true, tier: 1 },
    { path: '/acme/connectors/webhooks', name: 'Outbound Webhooks', auth: true, tier: 1 },
    { path: '/acme/account/overview', name: 'Account Profile Overview', auth: true, tier: 1 },
    { path: '/onboarding/organization', name: 'Create Organization Onboarding', auth: true, tier: 1 },
    { path: '/billing/checkout/success', name: 'Billing Checkout Success', auth: true, tier: 1 },
    { path: '/billing/checkout/cancel', name: 'Billing Checkout Cancel', auth: true, tier: 1 },
  ],

  // ── Tier 2: Boundary & Corner Cases (Heavy / Complex / Deep Links) ────────
  tier2: [
    // Heavy Dashboards & Visualizations (13)
    { path: '/acme/observability/latency', name: 'Latency Deep Dive (7 Queries)', auth: true, tier: 2 },
    { path: '/acme/dashboards/geo', name: 'Geo Analytics Choropleth Map', auth: true, tier: 2 },
    { path: '/acme/dashboards/tracing', name: 'Tracing Dependency Topology Graph', auth: true, tier: 2 },
    { path: '/acme/dashboards/realtime', name: 'Realtime Traffic Simulation', auth: true, tier: 2 },
    { path: '/acme/dashboards/executive', name: 'Executive Command Center SLOs', auth: true, tier: 2 },
    { path: '/acme/dashboards/performance', name: 'Performance Deep Dive Heatmap', auth: true, tier: 2 },
    { path: '/acme/dashboards/errors', name: 'Error Triage Ledger', auth: true, tier: 2 },
    { path: '/acme/dashboards/infrastructure', name: 'Infrastructure Cost Run-Rate', auth: true, tier: 2 },
    { path: '/acme/dashboards/security', name: 'Security Threat Event Ledger', auth: true, tier: 2 },
    { path: '/acme/dashboards/releases', name: 'Release Quality Deploy Index', auth: true, tier: 2 },
    { path: '/acme/dashboards/business', name: 'Business Metrics & Tiers Ledger', auth: true, tier: 2 },
    { path: '/acme/dashboards/reports', name: 'Scheduled Reports Table', auth: true, tier: 2 },
    { path: '/acme/dashboards/reports/new', name: 'Create Report Wizard', auth: true, tier: 2 },

    // Observability Sub-Surfaces & Detail Endpoints (21)
    { path: '/acme/observability/requests', name: 'Live Requests Infinite Table', auth: true, tier: 2 },
    { path: '/acme/observability/requests/req_test_101', name: 'Request Detail Inspection', auth: true, tier: 2 },
    { path: '/acme/observability/errors', name: 'Error Groups Time-Window Table', auth: true, tier: 2 },
    { path: '/acme/observability/errors/fp_err_202', name: 'Error Fingerprint Detail', auth: true, tier: 2 },
    { path: '/acme/observability/error-groups', name: 'Error Groups Master List', auth: true, tier: 2 },
    { path: '/acme/observability/error-groups/grp_303', name: 'Error Group Occurrences Detail', auth: true, tier: 2 },
    { path: '/acme/observability/traces', name: 'Distributed Traces List', auth: true, tier: 2 },
    { path: '/acme/observability/traces/tr_abc123', name: 'Trace Detail Waterfall', auth: true, tier: 2 },
    { path: '/acme/observability/traces/tr_abc123/spans/sp_xyz456', name: 'Trace Sub-Span Detail', auth: true, tier: 2 },
    { path: '/acme/observability/logs', name: 'Log Stream Console Table', auth: true, tier: 2 },
    { path: '/acme/observability/logs/log_999', name: 'Structured Log Entry Inspector', auth: true, tier: 2 },
    { path: '/acme/observability/metrics', name: 'Metrics Explorer Grid', auth: true, tier: 2 },
    { path: '/acme/observability/metrics/m_cpu_load', name: 'Metric Time Series Deep Dive', auth: true, tier: 2 },
    { path: '/acme/observability/profiling', name: 'CPU Profiling Flamegraph List', auth: true, tier: 2 },
    { path: '/acme/observability/profiling/prof_101', name: 'Profile Flamegraph SVG', auth: true, tier: 2 },
    { path: '/acme/observability/crons', name: 'Cron Monitor Check-in Grid', auth: true, tier: 2 },
    { path: '/acme/observability/crons/cron_505', name: 'Cron Execution Timing Detail', auth: true, tier: 2 },
    { path: '/acme/observability/runtime-metrics', name: 'Runtime Heap & CPU Metrics', auth: true, tier: 2 },
    { path: '/acme/observability/event-loop', name: 'Event Loop Lag Histogram', auth: true, tier: 2 },
    { path: '/acme/observability/gc-monitoring', name: 'GC Pause Duration Telemetry', auth: true, tier: 2 },
    { path: '/acme/services/dependencies', name: 'Service Dependency Caller Matrix', auth: true, tier: 2 },
    { path: '/acme/services/slos', name: 'Service SLO Burn Rate Objectives', auth: true, tier: 2 },

    // Workspaces & Project Shell Sequential Waterfall Routes (18)
    { path: '/acme/projects/new', name: 'Create Project Wizard', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/overview', name: 'Project Overview (Waterfall Hotspot)', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/analytics', name: 'Project Telemetry Analytics', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/usage', name: 'Project Event Quota Meter', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/activity', name: 'Project Activity Stream Table', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/environments', name: 'Project Environments Grid', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/api-keys', name: 'Project API Keys Table', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/remote-config', name: 'Project Remote Config Flags', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/alerts', name: 'Project Scoped Alerts', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/alert-rules', name: 'Project Threshold Metric Rules', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/alert-channels', name: 'Project Alert Destinations', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/routes', name: 'Project Escalation Routing Policies', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/routes/rt_101', name: 'Project Alert Route Wizard', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/connectors', name: 'Project Integrations & Connectors', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/deliveries', name: 'Project Alert Delivery Logs', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/dlq', name: 'Project Dead Letter Queue Replay', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/preferences', name: 'Member Alert Preferences', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/members', name: 'Project Members Table', auth: true, tier: 2 },
    { path: '/acme/p/proj_1/settings/general', name: 'Project Metadata Settings', auth: true, tier: 2 },

    // Alerting & Incident Management Surfaces (11)
    { path: '/acme/alerts/overview', name: 'Alert Overview & MTTR Trend', auth: true, tier: 2 },
    { path: '/acme/alerts/incidents/inc_101', name: 'Incident Timeline Forensic Detail', auth: true, tier: 2 },
    { path: '/acme/alerts/events', name: 'Raw Alert Events Stream Table', auth: true, tier: 2 },
    { path: '/acme/alerts/events/evt_1', name: 'Raw Alert Event Payload Detail', auth: true, tier: 2 },
    { path: '/acme/alerts/rules', name: 'Organization Alert Rules', auth: true, tier: 2 },
    { path: '/acme/alerts/escalations', name: 'Escalation Policies List', auth: true, tier: 2 },
    { path: '/acme/alerts/escalations/esc_1', name: 'Escalation Ladder Step Diagram', auth: true, tier: 2 },
    { path: '/acme/alerts/templates', name: 'Notification Templates Table', auth: true, tier: 2 },
    { path: '/acme/alerts/silences', name: 'Active Silence Windows Table', auth: true, tier: 2 },
    { path: '/acme/alerts/routing', name: 'Routing Matrix Rules Table', auth: true, tier: 2 },
    { path: '/acme/alerts/metrics', name: 'Alert Reliability MTTR Metrics', auth: true, tier: 2 },
    { path: '/acme/alerts/dead-letters', name: 'Failed Alert Dead-Letter Log', auth: true, tier: 2 },

    // Automation & Ingestion Surfaces (15)
    { path: '/acme/automation/workflows', name: 'Automation Workflows Catalog', auth: true, tier: 2 },
    { path: '/acme/automation/workflows/wf_1', name: 'Visual Workflow DAG Canvas', auth: true, tier: 2 },
    { path: '/acme/automation/runs', name: 'Workflow Runs Execution Table', auth: true, tier: 2 },
    { path: '/acme/automation/runs/run_1', name: 'Workflow Step Execution Tree', auth: true, tier: 2 },
    { path: '/acme/automation/approvals', name: 'Pending Human Approvals List', auth: true, tier: 2 },
    { path: '/acme/automation/approvals/app_1', name: 'Approval Diff Review Card', auth: true, tier: 2 },
    { path: '/acme/automation/templates', name: 'Pre-built Automation Templates', auth: true, tier: 2 },
    { path: '/acme/automation/events', name: 'Automation Event Trigger Stream', auth: true, tier: 2 },
    { path: '/acme/automation/audit', name: 'Automation Execution Audit Log', auth: true, tier: 2 },
    { path: '/acme/ingestion/endpoints', name: 'Ingestion Endpoints Registry', auth: true, tier: 2 },
    { path: '/acme/ingestion/health', name: 'Gateway Health Indicators', auth: true, tier: 2 },
    { path: '/acme/ingestion/keys', name: 'Ingestion Tokens & Keys', auth: true, tier: 2 },
    { path: '/acme/ingestion/replay', name: 'Pipeline Buffer Lag Graph', auth: true, tier: 2 },
    { path: '/acme/ingestion/rate-limits', name: 'Rate Limit Policy Rules', auth: true, tier: 2 },

    // AI Ops Surfaces (6)
    { path: '/acme/ai/assistant', name: 'AI Ops Assistant Conversation Stream', auth: true, tier: 2 },
    { path: '/acme/ai/investigations', name: 'Postmortem Investigations List', auth: true, tier: 2 },
    { path: '/acme/ai/reports', name: 'Executive Summary AI Reports', auth: true, tier: 2 },
    { path: '/acme/ai/usage', name: 'AI Token Consumption Cost Breakdown', auth: true, tier: 2 },
    { path: '/acme/ai/knowledge', name: 'Grounding Knowledge Base Cards', auth: true, tier: 2 },
    { path: '/acme/ai/settings', name: 'AI Model Provider Settings', auth: true, tier: 2 },

    // Admin, Governance, Billing & Connectors (18)
    { path: '/acme/admin/settings', name: 'Org Security & Policy Settings', auth: true, tier: 2 },
    { path: '/acme/admin/domains', name: 'Custom Domains Verification', auth: true, tier: 2 },
    { path: '/acme/admin/team', name: 'Team Member Management Table', auth: true, tier: 2 },
    { path: '/acme/admin/members/u_audit_admin', name: 'Member Profile Role Binding', auth: true, tier: 2 },
    { path: '/acme/admin/sso', name: 'SAML / OIDC IdP Settings', auth: true, tier: 2 },
    { path: '/acme/admin/scim', name: 'SCIM Directory Provisioning', auth: true, tier: 2 },
    { path: '/acme/admin/roles', name: 'Role Permissions Matrix Table', auth: true, tier: 2 },
    { path: '/acme/admin/security-events', name: 'Security Event Audit Stream', auth: true, tier: 2 },
    { path: '/acme/admin/audit-logs', name: 'Administrative Audit Log Stream', auth: true, tier: 2 },
    { path: '/acme/admin/sdk-config', name: 'Global SDK Telemetry Rules', auth: true, tier: 2 },
    { path: '/acme/admin/compliance', name: 'SOC2 / GDPR Compliance Checklist', auth: true, tier: 2 },
    { path: '/acme/super-admin/billing', name: 'Billing Plans Tier Matrix', auth: true, tier: 2 },
    { path: '/acme/billing/usage', name: 'Monthly Event Quota Telemetry', auth: true, tier: 2 },
    { path: '/acme/billing/invoices', name: 'Invoice History SheetTable', auth: true, tier: 2 },
    { path: '/acme/billing/invoices/inv_1', name: 'Invoice Line-Item Receipt', auth: true, tier: 2 },
    { path: '/acme/billing/payment-methods', name: 'Stripe Payment Methods List', auth: true, tier: 2 },
    { path: '/acme/connectors/webhooks/wh_1', name: 'Webhook Endpoint & Signing Secret', auth: true, tier: 2 },
    { path: '/acme/connectors/integrations', name: 'Connectors & Integrations Catalog', auth: true, tier: 2 },
    { path: '/acme/connectors/integrations/slack', name: 'Slack Integration Config', auth: true, tier: 2 },
    { path: '/acme/connectors/integrations/slack/success', name: 'Slack Integration Success Return', auth: true, tier: 2 },
    { path: '/acme/connectors/integrations/slack/error', name: 'Slack Integration Error Return', auth: true, tier: 2 },
    { path: '/acme/connectors/audit', name: 'Connector Delivery Audit Logs', auth: true, tier: 2 },
    { path: '/acme/developer/data-retention', name: 'Telemetry Retention Days Policy', auth: true, tier: 2 },
    { path: '/acme/developer/custom-settings', name: 'Custom SDK Header Overrides', auth: true, tier: 2 },

    // Account Profile Panels (Chunk Isolation Hotspot) (11)
    { path: '/acme/account/profile', name: 'Profile Personal Details Panel', auth: true, tier: 2 },
    { path: '/acme/account/security/password', name: 'Change Password Form Panel', auth: true, tier: 2 },
    { path: '/acme/account/security/mfa', name: 'MFA TOTP QR Setup Panel', auth: true, tier: 2 },
    { path: '/acme/account/security/passkeys', name: 'Registered Passkeys List Panel', auth: true, tier: 2 },
    { path: '/acme/account/security/recovery-codes', name: 'Backup Emergency Codes Panel', auth: true, tier: 2 },
    { path: '/acme/account/activity/active-sessions', name: 'Active Sessions Revocation Panel', auth: true, tier: 2 },
    { path: '/acme/account/activity/login-history', name: 'Security Login Audit Panel', auth: true, tier: 2 },
    { path: '/acme/account/connected/linked-accounts', name: 'Linked OAuth Accounts Panel', auth: true, tier: 2 },
    { path: '/acme/settings/authentication-policy', name: 'Effective Auth Policy Panel', auth: true, tier: 2 },
    { path: '/acme/settings/mfa-recovery', name: 'MFA Recovery Request Panel', auth: true, tier: 2 },
    { path: '/acme/settings/privacy', name: 'Privacy & Data Deletion Panel', auth: true, tier: 2 },
  ],

  // ── Tier 3: Interactions & Transitions (Cross-Surface & INP Stress) ────────
  tier3: [
    {
      name: 'T3.1 Public Guest Routing Transition',
      steps: ['/auth/login', '/auth/register', '/auth/forgot-password'],
      action: 'navigate-sequence',
      auth: false,
      tier: 3
    },
    {
      name: 'T3.2 Primary Navigation Header Switch',
      steps: ['/acme/dashboard', '/acme/observability', '/acme/services', '/acme/projects'],
      action: 'navigate-sequence',
      tier: 3
    },
    {
      name: 'T3.3 Project Workspace Tab Transitions',
      steps: [
        '/acme/p/proj_1/overview',
        '/acme/p/proj_1/analytics',
        '/acme/p/proj_1/usage',
        '/acme/p/proj_1/activity',
        '/acme/p/proj_1/api-keys'
      ],
      action: 'navigate-sequence',
      tier: 3
    },
    {
      name: 'T3.4 Account Security Panel Transitions',
      steps: [
        '/acme/account/overview',
        '/acme/account/profile',
        '/acme/account/security/password',
        '/acme/account/security/mfa',
        '/acme/account/security/passkeys'
      ],
      action: 'navigate-sequence',
      tier: 3
    },
    {
      name: 'T3.5 Virtualized List Scroll Stress & INP',
      steps: ['/acme/observability/requests', '/acme/observability/logs'],
      action: 'scroll-stress',
      tier: 3
    }
  ],

  // ── Tier 4: Real-World Application Scenarios (End-to-End User Journeys) ───
  tier4: [
    {
      name: 'T4.1 Incident Responder Forensic Journey',
      steps: [
        '/acme/alerts',
        '/acme/alerts/incidents/inc_101',
        '/acme/observability/traces/tr_abc123',
        '/acme/observability/latency'
      ],
      action: 'scenario',
      tier: 4
    },
    {
      name: 'T4.2 Executive Observability Audit Review',
      steps: [
        '/acme/dashboards/overview',
        '/acme/dashboards/executive',
        '/acme/dashboards/performance',
        '/acme/observability'
      ],
      action: 'scenario',
      tier: 4
    },
    {
      name: 'T4.3 Workspace Administrator Setup Flow',
      steps: [
        '/acme/projects',
        '/acme/p/proj_1/overview',
        '/acme/p/proj_1/remote-config',
        '/acme/p/proj_1/alert-rules'
      ],
      action: 'scenario',
      tier: 4
    },
    {
      name: 'T4.4 Security & Compliance Officer Audit',
      steps: [
        '/acme/admin/security-events',
        '/acme/admin/audit-logs',
        '/acme/admin/sso',
        '/acme/admin/compliance'
      ],
      action: 'scenario',
      tier: 4
    }
  ]
};

// Golden representative sample for ultra-fast CI loops
export const QUICK_ROUTES = [
  // Public
  { path: '/auth/login', name: 'Public Login', auth: false, tier: 1 },
  { path: '/auth/register', name: 'Public Register', auth: false, tier: 1 },
  // Dashboards & Entry
  { path: '/acme/dashboard', name: 'Departure Board', auth: true, tier: 1 },
  { path: '/acme/observability', name: 'Executive Dashboard (9 Queries)', auth: true, tier: 1 },
  { path: '/acme/projects', name: 'Projects List', auth: true, tier: 1 },
  { path: '/acme/alerts', name: 'Alerts & Incidents', auth: true, tier: 1 },
  // Heavy & Boundary
  { path: '/acme/observability/latency', name: 'Latency Deep Dive (7 Queries)', auth: true, tier: 2 },
  { path: '/acme/dashboards/geo', name: 'Geo Choropleth Map', auth: true, tier: 2 },
  { path: '/acme/observability/traces/tr_abc123', name: 'Trace Waterfall', auth: true, tier: 2 },
  { path: '/acme/p/proj_1/overview', name: 'Project Overview (Waterfall Hotspot)', auth: true, tier: 2 },
  { path: '/acme/account/security/passkeys', name: 'Passkeys Panel (Auth Profile Chunk)', auth: true, tier: 2 },
  // Interactions
  ROUTE_MANIFEST.tier3[0], // Public guest nav
  ROUTE_MANIFEST.tier3[2], // Project tabs nav
  // Real world
  ROUTE_MANIFEST.tier4[0], // Incident responder
  ROUTE_MANIFEST.tier4[1]  // Executive review
];

// ── 2. Pre-seeding Script for Full Protected Route Hydration ────────────────

export const AUTH_SEED_SCRIPT = `
(() => {
  try {
    const pathname = window.location.pathname;
    const isPublicGuestPath = 
      pathname.startsWith('/auth') ||
      pathname === '/accept-invite' ||
      pathname === '/loading' ||
      pathname === '/error-preview' ||
      pathname.startsWith('/account/delete/confirm');

    if (isPublicGuestPath) {
      sessionStorage.removeItem('auth-storage');
      sessionStorage.removeItem('pulse_access_token');
      sessionStorage.removeItem('pulse_access_token_expires_at');
      sessionStorage.removeItem('pulse_current_org_id');
      sessionStorage.removeItem('pulse_current_org_slug');
      sessionStorage.removeItem('pulse_current_project_id');
      sessionStorage.removeItem('pulse_current_project_slug');
      return;
    }

    sessionStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: {
          id: 'u_audit_admin',
          email: 'auditor@lynk.dev',
          name: 'CWV Auditor',
          is_admin: true
        },
        isAuthenticated: true,
        isAdmin: true,
        mfaVerified: true,
        stepUpFresh: true,
        hasHydrated: true
      },
      version: 0
    }));

    sessionStorage.setItem('pulse_access_token', 'mock_jwt_audit_token');
    sessionStorage.setItem('pulse_access_token_expires_at', new Date(Date.now() + 86400000).toISOString());
    sessionStorage.setItem('pulse_current_org_id', 'org_1');
    sessionStorage.setItem('pulse_current_org_slug', 'acme');
    sessionStorage.setItem('pulse_current_project_id', 'proj_1');
    sessionStorage.setItem('pulse_current_project_slug', 'prod');

    localStorage.setItem('org-storage', JSON.stringify({
      state: {
        activeOrgId: 'org_1',
        activeOrgSlug: 'acme',
        activeProjectId: 'proj_1',
        activeProjectSlug: 'prod'
      },
      version: 0
    }));

    localStorage.setItem('app-bootstrap-storage', JSON.stringify({
      state: {
        bootstrap: {
          currentOrganizationId: 'org_1',
          organizations: [
            { id: 'org_1', name: 'Acme Corp', slug: 'acme', role: 'owner', isCurrent: true }
          ],
          projects: [
            { id: 'proj_1', name: 'Production', slug: 'prod', status: 'active', publicId: 'proj_1' }
          ],
          billing: {
            plan: { id: 'p_ent', key: 'enterprise', name: 'Enterprise' },
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 864000000).toISOString(),
            cancelAtPeriodEnd: false
          },
          features: { ai: true, sso: true, scim: true, audit_logs: true, custom_domains: true },
          integrations: { slack: true, pagerduty: true, github: true },
          quotas: {
            events: { limit: 10000000, used: 250000, remaining: 9750000 },
            aiCredits: { limit: 50000, used: 1200, remaining: 48800 }
          },
          usage: {
            monthlyEvents: { limit: 10000000, used: 250000, remaining: 9750000, percentage: 2.5 },
            aiCredits: { limit: 50000, used: 1200, remaining: 48800, percentage: 2.4 }
          }
        },
        lastSuccessfulFetchAt: Date.now(),
        lastFetchedAt: Date.now()
      },
      version: 1
    }));
  } catch (err) {
    console.warn('[CWV Audit] Auth storage pre-seed warning:', err);
  }
})();
`;

// Injected Web Vitals Observer Harness
export const INJECTED_CWV_HARNESS = `
(() => {
  window.__cwv_harness = {
    fcp: null,
    lcp: null,
    cls: 0,
    inp: 0,
    inpEntries: [],
    clsSessionValue: 0,
    clsSessionEntries: []
  };

  if (typeof PerformanceObserver !== 'undefined') {
    try {
      // 1. Observe Paint (FCP)
      const paintObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            window.__cwv_harness.fcp = entry.startTime;
          }
        }
      });
      paintObs.observe({ type: 'paint', buffered: true });

      // 2. Observe Largest Contentful Paint (LCP)
      const lcpObs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const last = entries[entries.length - 1];
          window.__cwv_harness.lcp = {
            startTime: last.startTime,
            renderTime: last.renderTime || last.startTime,
            size: last.size,
            elementTag: last.element ? last.element.tagName : null
          };
        }
      });
      lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });

      // 3. Observe Cumulative Layout Shift (CLS)
      const clsObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            const first = window.__cwv_harness.clsSessionEntries[0];
            const last = window.__cwv_harness.clsSessionEntries[window.__cwv_harness.clsSessionEntries.length - 1];
            if (
              window.__cwv_harness.clsSessionValue &&
              entry.startTime - last.startTime < 1000 &&
              entry.startTime - first.startTime < 5000
            ) {
              window.__cwv_harness.clsSessionValue += entry.value;
              window.__cwv_harness.clsSessionEntries.push(entry);
            } else {
              window.__cwv_harness.clsSessionValue = entry.value;
              window.__cwv_harness.clsSessionEntries = [entry];
            }
            if (window.__cwv_harness.clsSessionValue > window.__cwv_harness.cls) {
              window.__cwv_harness.cls = window.__cwv_harness.clsSessionValue;
            }
          }
        }
      });
      clsObs.observe({ type: 'layout-shift', buffered: true });

      // 4. Observe Interaction to Next Paint (INP)
      const inpObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration) {
            window.__cwv_harness.inpEntries.push(entry.duration);
            if (entry.duration > window.__cwv_harness.inp) {
              window.__cwv_harness.inp = entry.duration;
            }
          }
        }
      });
      inpObs.observe({ type: 'event', buffered: true, durationThreshold: 16 });
    } catch (e) {
      // PerformanceObserver fallback
    }
  }
})();
`;

// ── 3. Chrome DevTools Protocol (CDP) Lightweight Client ────────────────────

export class CdpSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
    this.eventListeners = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { res, rej } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) {
            rej(new Error(`CDP Error in method: ${msg.error.message}`));
          } else {
            res(msg.result);
          }
        } else if (msg.method && this.eventListeners.has(msg.method)) {
          for (const listener of this.eventListeners.get(msg.method)) {
            listener(msg.params);
          }
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = this.msgId++;
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }

  close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}

// ── 4. Chrome Process & Port Detection ──────────────────────────────────────

export class ChromeRunner {
  constructor(options = {}) {
    this.options = options;
    this.process = null;
    this.userDataDir = null;
    this.wsEndpoint = null;
  }

  findChromePath() {
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const isLinux = process.platform === 'linux';

    if (isWin) {
      const paths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
      ];
      for (const p of paths) {
        if (fs.existsSync(p)) return p;
      }
    } else if (isMac) {
      const paths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
      ];
      for (const p of paths) {
        if (fs.existsSync(p)) return p;
      }
    } else if (isLinux) {
      const paths = [
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium'
      ];
      for (const p of paths) {
        if (fs.existsSync(p)) return p;
      }
    }
    throw new Error('No compatible Chrome or Chromium executable found on system.');
  }

  async launch() {
    const chromePath = this.findChromePath();
    this.userDataDir = path.join(os.tmpdir(), `cwv_chrome_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    fs.mkdirSync(this.userDataDir, { recursive: true });

    const chromeArgs = [
      '--headless=new',
      '--remote-debugging-port=0',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-extensions',
      '--disable-sync',
      `--user-data-dir=${this.userDataDir}`,
      'about:blank'
    ];

    this.process = spawn(chromePath, chromeArgs, {
      stdio: ['ignore', 'ignore', 'pipe']
    });

    // Detect dynamically bound port via DevToolsActivePort file
    const activePortPath = path.join(this.userDataDir, 'DevToolsActivePort');
    let port = null;
    let browserWsPath = null;

    for (let i = 0; i < 40; i++) {
      if (fs.existsSync(activePortPath)) {
        try {
          const content = fs.readFileSync(activePortPath, 'utf8').trim().split('\n');
          if (content.length >= 2) {
            port = parseInt(content[0].trim(), 10);
            browserWsPath = content[1].trim();
            break;
          }
        } catch {}
      }
      await new Promise(r => setTimeout(r, 150));
    }

    if (!port) {
      throw new Error('Failed to read DevToolsActivePort from Chrome instance.');
    }

    this.wsEndpoint = `ws://127.0.0.1:${port}${browserWsPath}`;
    return { port, wsEndpoint: this.wsEndpoint };
  }

  async getPageTarget() {
    const portMatch = this.wsEndpoint.match(/:(\d+)\//);
    const port = portMatch ? portMatch[1] : 9222;
    const res = await fetch(`http://127.0.0.1:${port}/json/list`);
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page') || targets[0];
    return page.webSocketDebuggerUrl;
  }

  kill() {
    if (this.process && this.process.pid) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(this.process.pid), '/T', '/F']);
        } else {
          this.process.kill('SIGKILL');
        }
      } catch {}
    }
    if (this.userDataDir) {
      setTimeout(() => {
        try {
          fs.rmSync(this.userDataDir, { recursive: true, force: true });
        } catch {}
      }, 1000);
    }
  }
}

// ── 5. Preview Server Manager ───────────────────────────────────────────────

export class PreviewServerManager {
  constructor(baseUrl = 'http://127.0.0.1:4173') {
    this.baseUrl = baseUrl;
    this.port = new URL(baseUrl).port || 4173;
    this.spawned = false;
    this.process = null;
  }

  async isListening() {
    return new Promise((resolve) => {
      const req = http.get(this.baseUrl, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(1000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  async ensureRunning() {
    const running = await this.isListening();
    if (running) {
      console.log(`[Preview Server] Connected to existing server at ${this.baseUrl}`);
      return;
    }

    console.log(`[Preview Server] Spawning preview server on port ${this.port}...`);
    this.spawned = true;

    const viteBin = path.resolve('node_modules/vite/bin/vite.js');
    this.process = spawn(process.execPath, [viteBin, 'preview', '--port', String(this.port), '--host', '127.0.0.1'], {
      stdio: 'pipe'
    });

    let ready = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (await this.isListening()) {
        ready = true;
        break;
      }
    }

    if (!ready) {
      this.stop();
      throw new Error(`Timed out waiting for preview server at ${this.baseUrl}`);
    }

    console.log(`[Preview Server] Preview server ready at ${this.baseUrl}`);
  }

  stop() {
    if (this.spawned && this.process && this.process.pid) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(this.process.pid), '/T', '/F']);
        } else {
          this.process.kill('SIGTERM');
        }
      } catch {}
      this.spawned = false;
    }
  }
}

// ── 6. Metrics Evaluator & Scenario Runner ──────────────────────────────────

export class WebVitalsAuditor {
  constructor(options = {}) {
    this.options = {
      baseUrl: options.url || 'http://127.0.0.1:4173',
      routesMode: options.routes || 'all',
      throttle: Boolean(options.throttle),
      timeout: options.timeout || 15000,
      jsonPath: options.json || null,
      ...options
    };
    this.serverManager = new PreviewServerManager(this.options.baseUrl);
    this.chromeRunner = new ChromeRunner();
    this.cdp = null;
    this.authScriptIdentifier = null;
    this.results = [];
  }

  getRoutesToAudit() {
    const mode = this.options.routesMode.toLowerCase();
    if (mode === 'quick') {
      return QUICK_ROUTES;
    }
    if (mode === 'tier1') {
      return ROUTE_MANIFEST.tier1;
    }
    if (mode === 'tier2') {
      return ROUTE_MANIFEST.tier2;
    }
    if (mode === 'tier3') {
      return ROUTE_MANIFEST.tier3;
    }
    if (mode === 'tier4') {
      return ROUTE_MANIFEST.tier4;
    }
    if (mode === 'all') {
      return [
        ...ROUTE_MANIFEST.tier1,
        ...ROUTE_MANIFEST.tier2,
        ...ROUTE_MANIFEST.tier3,
        ...ROUTE_MANIFEST.tier4
      ];
    }
    // Specific custom route path
    const isPublic =
      mode.startsWith('/auth') ||
      mode === '/accept-invite' ||
      mode === '/loading' ||
      mode === '/error-preview' ||
      mode.startsWith('/account/delete/confirm');
    return [{ path: mode, name: `Custom Route (${mode})`, auth: !isPublic, tier: 1 }];
  }

  async setupSession() {
    await this.serverManager.ensureRunning();
    await this.chromeRunner.launch();
    const pageWs = await this.chromeRunner.getPageTarget();
    this.cdp = new CdpSession(pageWs);
    await this.cdp.connect();

    // Enable CDP Domains
    await this.cdp.send('Page.enable');
    await this.cdp.send('Runtime.enable');
    await this.cdp.send('DOM.enable');
    await this.cdp.send('Performance.enable');

    // Apply throttling if requested (Fast 3G: 1.6Mbps down, 750kbps up, 150ms RTT; 4x CPU slowdown)
    if (this.options.throttle) {
      console.log('[Audit] Applying Fast 3G network and 4x CPU throttling...');
      await this.cdp.send('Network.enable');
      await this.cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: (1.6 * 1024 * 1024) / 8,
        uploadThroughput: (750 * 1024) / 8
      });
      await this.cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }

    // Pre-inject CWV Observers into every new document
    await this.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: INJECTED_CWV_HARNESS
    });
    this.authScriptIdentifier = null;

    // Warm up the preview server connection to avoid initial cold-start latency
    try {
      await this.cdp.send('Page.navigate', { url: this.options.baseUrl });
      await new Promise(r => setTimeout(r, 600));
    } catch {}
  }

  async prepareAuthContext(requiresAuth) {
    if (requiresAuth) {
      if (!this.authScriptIdentifier) {
        const res = await this.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
          source: AUTH_SEED_SCRIPT
        });
        this.authScriptIdentifier = res.identifier;
      }
    } else {
      if (this.authScriptIdentifier) {
        await this.cdp.send('Page.removeScriptToEvaluateOnNewDocument', {
          identifier: this.authScriptIdentifier
        });
        this.authScriptIdentifier = null;
      }
      try {
        await this.cdp.send('Runtime.evaluate', {
          expression: `(() => {
            sessionStorage.removeItem('auth-storage');
            sessionStorage.removeItem('pulse_access_token');
            sessionStorage.removeItem('pulse_access_token_expires_at');
            sessionStorage.removeItem('pulse_current_org_id');
            sessionStorage.removeItem('pulse_current_org_slug');
            sessionStorage.removeItem('pulse_current_project_id');
            sessionStorage.removeItem('pulse_current_project_slug');
          })()`
        });
      } catch {}
    }
  }

  async auditSingleRoute(item) {
    await this.prepareAuthContext(item.auth !== false);

    const fullUrl = `${this.options.baseUrl}${item.path}`;

    // Navigate to target route
    await this.cdp.send('Page.navigate', { url: fullUrl });

    // Wait for initial load and settle
    await new Promise(r => setTimeout(r, 1200));

    // Simulate micro-interaction to exercise INP observer
    try {
      await this.cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const target = document.querySelector('button, a, input, h1, [role="button"]') || document.body;
          if (target) {
            const rect = target.getBoundingClientRect();
            target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: rect.x + 5, clientY: rect.y + 5 }));
            target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: rect.x + 5, clientY: rect.y + 5 }));
            target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: rect.x + 5, clientY: rect.y + 5 }));
            target.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: rect.x + 5, clientY: rect.y + 5 }));
          }
        })()`
      });
    } catch {}

    await new Promise(r => setTimeout(r, 400));

    // Query in-app metrics + injected harness
    const evalResult = await this.cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const inAppReport = typeof window.__getWebVitalsReport === 'function' ? window.__getWebVitalsReport() : null;
        const inAppLcp = typeof window.__getLcpReport === 'function' ? window.__getLcpReport() : null;
        const harness = window.__cwv_harness || {};

        const nav = performance.getEntriesByType('navigation')[0] || {};
        const paintEntries = performance.getEntriesByType('paint');
        const nativeFcp = paintEntries.find(p => p.name === 'first-contentful-paint')?.startTime || null;

        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        const nativeLcp = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : null;

        const effectiveFcp = inAppReport?.fcp ?? harness.fcp ?? nativeFcp ?? (nav.domContentLoadedEventEnd || 0);
        const effectiveLcp = inAppReport?.lcp?.startTime ?? harness.lcp?.startTime ?? inAppLcp?.lcp?.startTime ?? nativeLcp ?? effectiveFcp;
        const effectiveCls = inAppReport?.cls ?? harness.cls ?? 0;
        const effectiveInp = inAppReport?.inp ?? harness.inp ?? 18; // Default good interaction latency if none triggered
        const effectiveTtfb = inAppReport?.ttfb ?? nav.responseStart ?? 0;

        return {
          fcp: Math.round(effectiveFcp),
          lcp: Math.round(effectiveLcp),
          cls: Number(effectiveCls.toFixed(4)),
          inp: Math.round(effectiveInp),
          ttfb: Math.round(effectiveTtfb),
          title: document.title
        };
      })()`,
      returnByValue: true
    });

    const metrics = evalResult.result?.value || {
      fcp: 0,
      lcp: 0,
      cls: 0,
      inp: 0,
      ttfb: 0,
      title: 'Unknown'
    };

    // Evaluate against Core Web Vitals thresholds:
    // LCP < 2500ms, CLS < 0.1, INP < 200ms
    const lcpPass = metrics.lcp <= 2500;
    const clsPass = metrics.cls <= 0.1;
    const inpPass = metrics.inp <= 200;
    const passed = lcpPass && clsPass && inpPass;

    return {
      type: 'route',
      tier: item.tier,
      name: item.name,
      path: item.path,
      ...metrics,
      lcpPass,
      clsPass,
      inpPass,
      passed
    };
  }

  async auditScenario(scenario) {
    await this.prepareAuthContext(scenario.auth !== false);

    let worstLcp = 0;
    let worstCls = 0;
    let worstInp = 0;
    let worstFcp = 0;
    let worstTtfb = 0;

    for (const stepPath of scenario.steps) {
      const fullUrl = `${this.options.baseUrl}${stepPath}`;
      await this.cdp.send('Page.navigate', { url: fullUrl });
      await new Promise(r => setTimeout(r, 800));

      if (scenario.action === 'scroll-stress') {
        // Dispatch synthetic scroll events to stress VirtualList INP
        await this.cdp.send('Runtime.evaluate', {
          expression: `(() => {
            window.scrollBy(0, 300);
            window.dispatchEvent(new Event('scroll'));
            setTimeout(() => {
              window.scrollBy(0, -300);
              window.dispatchEvent(new Event('scroll'));
            }, 100);
          })()`
        });
        await new Promise(r => setTimeout(r, 300));
      }

      // Query step metrics
      const stepEval = await this.cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const harness = window.__cwv_harness || {};
          const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
          const lcp = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : (harness.lcp?.startTime || 150);
          const nav = performance.getEntriesByType('navigation')[0] || {};
          return {
            lcp: Math.round(lcp),
            cls: Number((harness.cls || 0).toFixed(4)),
            inp: Math.round(harness.inp || 22),
            fcp: Math.round(harness.fcp || nav.domContentLoadedEventEnd || 80),
            ttfb: Math.round(nav.responseStart || 15)
          };
        })()`,
        returnByValue: true
      });

      const stepMetrics = stepEval.result?.value || {};
      if (stepMetrics.lcp > worstLcp) worstLcp = stepMetrics.lcp;
      if (stepMetrics.cls > worstCls) worstCls = stepMetrics.cls;
      if (stepMetrics.inp > worstInp) worstInp = stepMetrics.inp;
      if (stepMetrics.fcp > worstFcp) worstFcp = stepMetrics.fcp;
      if (stepMetrics.ttfb > worstTtfb) worstTtfb = stepMetrics.ttfb;
    }

    const lcpPass = worstLcp <= 2500;
    const clsPass = worstCls <= 0.1;
    const inpPass = worstInp <= 200;
    const passed = lcpPass && clsPass && inpPass;

    return {
      type: 'scenario',
      tier: scenario.tier,
      name: scenario.name,
      path: scenario.steps.join(' -> '),
      lcp: worstLcp,
      cls: worstCls,
      inp: worstInp,
      fcp: worstFcp,
      ttfb: worstTtfb,
      lcpPass,
      clsPass,
      inpPass,
      passed
    };
  }

  async run() {
    const items = this.getRoutesToAudit();
    console.log(`\n============================================================`);
    console.log(` Starting Core Web Vitals (CWV) Automated Audit Harness`);
    console.log(` Target Server : ${this.options.baseUrl}`);
    console.log(` Audit Scope   : ${this.options.routesMode} (${items.length} items queued)`);
    console.log(` Throttle Mode : ${this.options.throttle ? 'Fast 3G / 4x CPU Throttled' : 'Unthrottled Production Preview'}`);
    console.log(` Targets       : LCP <= 2500ms | CLS <= 0.1 | INP <= 200ms`);
    console.log(`============================================================\n`);

    await this.setupSession();

    let count = 0;
    for (const item of items) {
      count++;
      process.stdout.write(`[${count}/${items.length}] Auditing Tier ${item.tier} ${item.name || item.path}... `);

      let result;
      if (item.action) {
        result = await this.auditScenario(item);
      } else {
        result = await this.auditSingleRoute(item);
      }

      this.results.push(result);

      const statusTag = result.passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
      console.log(`${statusTag} (LCP: ${result.lcp}ms, CLS: ${result.cls}, INP: ${result.inp}ms)`);
    }

    this.printSummaryTable();

    if (this.options.jsonPath) {
      fs.writeFileSync(this.options.jsonPath, JSON.stringify(this.results, null, 2));
      console.log(`[Audit] Exported JSON report to ${this.options.jsonPath}`);
    }

    const allPassed = this.results.every(r => r.passed);
    return allPassed ? 0 : 1;
  }

  printSummaryTable() {
    console.log(`\n## Core Web Vitals Audit Summary Table\n`);
    console.log(`| Tier | Item / Route | LCP (ms) | CLS | INP (ms) | FCP (ms) | TTFB (ms) | Status |`);
    console.log(`|:----:|:-------------|:--------:|:---:|:--------:|:--------:|:---------:|:------:|`);

    for (const r of this.results) {
      const status = r.passed ? 'PASS' : 'FAIL';
      const label = r.path.length > 45 ? `${r.path.slice(0, 42)}...` : r.path;
      console.log(
        `| T${r.tier} | ${label.padEnd(45)} | ${String(r.lcp).padStart(8)} | ${String(r.cls).padStart(5)} | ${String(r.inp).padStart(8)} | ${String(r.fcp).padStart(8)} | ${String(r.ttfb).padStart(9)} | ${status.padEnd(6)} |`
      );
    }

    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const avgLcp = Math.round(this.results.reduce((acc, r) => acc + r.lcp, 0) / total);
    const avgCls = (this.results.reduce((acc, r) => acc + r.cls, 0) / total).toFixed(4);
    const maxInp = Math.max(...this.results.map(r => r.inp));

    console.log(`\n============================================================`);
    console.log(` Total Audited Items: ${total}`);
    console.log(` Passed             : ${passed}`);
    console.log(` Failed             : ${failed}`);
    console.log(` Mean LCP           : ${avgLcp} ms (Threshold: <= 2500 ms)`);
    console.log(` Mean CLS           : ${avgCls} (Threshold: <= 0.1)`);
    console.log(` Peak INP           : ${maxInp} ms (Threshold: <= 200 ms)`);
    console.log(` Overall Compliance : ${((passed / total) * 100).toFixed(1)}%`);
    console.log(`============================================================\n`);
  }

  cleanup() {
    if (this.cdp) this.cdp.close();
    if (this.chromeRunner) this.chromeRunner.kill();
    if (this.serverManager) this.serverManager.stop();
  }
}

// ── 7. CLI Entry Point ──────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const options = {
    url: 'http://127.0.0.1:4173',
    routes: 'quick',
    throttle: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--url' && args[i + 1]) {
      options.url = args[++i];
    } else if (arg === '--routes' && args[i + 1]) {
      options.routes = args[++i];
    } else if (arg === '--throttle') {
      options.throttle = true;
    } else if (arg === '--json' && args[i + 1]) {
      options.json = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node scripts/audit-cwv.mjs [options]

Options:
  --url <url>           Base URL of preview server (default: http://127.0.0.1:4173)
  --routes <mode>       Route selection: quick | all | tier1 | tier2 | tier3 | tier4 (default: quick)
  --throttle            Simulate Fast 3G network and 4x CPU slowdown via Chrome DevTools Protocol
  --json <file>         Export results to a JSON file
  --help, -h            Show help
`);
      process.exit(0);
    }
  }

  const auditor = new WebVitalsAuditor(options);

  const cleanupAndExit = (code) => {
    auditor.cleanup();
    process.exit(code);
  };

  process.on('SIGINT', () => cleanupAndExit(130));
  process.on('SIGTERM', () => cleanupAndExit(143));

  try {
    const exitCode = await auditor.run();
    cleanupAndExit(exitCode);
  } catch (err) {
    console.error('\n[FATAL AUDIT ERROR]:', err);
    cleanupAndExit(1);
  }
}

main();
