import { useEffect } from "react";
import { useLocation } from "react-router";

interface RouteMeta {
  title: string;
  description: string;
}

function resolveRouteMeta(pathname: string): RouteMeta {
  const cleanPath = pathname.replace(/\/+$/, "") || "/";

  // Exact auth & public matches
  if (cleanPath === "/auth/login") {
    return {
      title: "Sign In — LynkTrace",
      description: "Sign in to LynkTrace to access your API observability and telemetry dashboard.",
    };
  }
  if (cleanPath === "/auth/register") {
    return {
      title: "Create Account — LynkTrace",
      description: "Create your LynkTrace account for real-time API monitoring, metrics, and distributed tracing.",
    };
  }
  if (cleanPath === "/auth/forgot-password") {
    return {
      title: "Reset Password — LynkTrace",
      description: "Request a password reset link for your LynkTrace account.",
    };
  }
  if (cleanPath === "/auth/reset-password") {
    return {
      title: "Set New Password — LynkTrace",
      description: "Enter your new password to regain access to LynkTrace.",
    };
  }
  if (cleanPath === "/auth/verify-email") {
    return {
      title: "Verify Email — LynkTrace",
      description: "Confirm your email address to activate your LynkTrace account.",
    };
  }
  if (cleanPath === "/auth/unlock" || cleanPath === "/auth/unlock/confirm") {
    return {
      title: "Unlock Account — LynkTrace",
      description: "Request or confirm an account unlock verification link.",
    };
  }
  if (cleanPath === "/auth/login/sso") {
    return {
      title: "Single Sign-On — LynkTrace",
      description: "Authenticate with your corporate identity provider using SAML 2.0 or OIDC.",
    };
  }
  if (cleanPath === "/auth/login/mfa" || cleanPath === "/auth/login/backup-code") {
    return {
      title: "Two-Step Verification — LynkTrace",
      description: "Confirm your second factor or enter a backup security code to proceed.",
    };
  }
  if (cleanPath === "/auth/callback") {
    return {
      title: "Authenticating — LynkTrace",
      description: "Validating your credentials and redirecting to your workspace.",
    };
  }
  if (cleanPath === "/onboarding/organization") {
    return {
      title: "Create Organization — LynkTrace",
      description: "Set up a new organization workspace for your projects, members, and billing.",
    };
  }
  if (cleanPath === "/accept-invite") {
    return {
      title: "Join Workspace — LynkTrace",
      description: "Accept an invitation to collaborate with members on LynkTrace.",
    };
  }
  if (cleanPath === "/account/delete/confirm") {
    return {
      title: "Confirm Deletion — LynkTrace",
      description: "Review and confirm permanent account deletion.",
    };
  }

  // Suffix matching for dashboard and subroutes
  if (cleanPath.endsWith("/dashboard") || cleanPath === "/dashboard") {
    return {
      title: "Executive Dashboard — LynkTrace",
      description: "High-level overview of health, throughput, error rates, and incident status across your services.",
    };
  }
  if (cleanPath.endsWith("/projects/new")) {
    return {
      title: "Create Project — LynkTrace",
      description: "Initialize a new project and generate telemetry ingestion credentials.",
    };
  }
  if (cleanPath.endsWith("/projects")) {
    return {
      title: "Projects — LynkTrace",
      description: "Manage projects, ingestion keys, and environment targets.",
    };
  }
  if (cleanPath.includes("/projects/") && cleanPath.endsWith("/analytics")) {
    return {
      title: "Analytics — LynkTrace",
      description: "Latency histograms, percentile breakdowns, and request volume trends.",
    };
  }
  if (cleanPath.includes("/projects/") && cleanPath.endsWith("/alerts")) {
    return {
      title: "Alerts — LynkTrace",
      description: "Threshold rules, notification destinations, and firing incidents.",
    };
  }
  if (cleanPath.includes("/projects/") && cleanPath.endsWith("/settings")) {
    return {
      title: "Project Settings — LynkTrace",
      description: "Project configuration, retention policies, and deletion safeguards.",
    };
  }
  if (cleanPath.includes("/projects/") && cleanPath.endsWith("/api-keys")) {
    return {
      title: "API Keys — LynkTrace",
      description: "Manage ingest keys and client access tokens securely.",
    };
  }
  if (cleanPath.includes("/projects/") && cleanPath.endsWith("/remote-config")) {
    return {
      title: "Remote Config — LynkTrace",
      description: "Dynamic feature flags, client rate limits, and live logging levels.",
    };
  }
  if (cleanPath.includes("/projects/") && cleanPath.endsWith("/thresholds")) {
    return {
      title: "Thresholds & Budgets — LynkTrace",
      description: "Set latency SLOs, error rate ceilings, and capacity alerts.",
    };
  }
  if (cleanPath.includes("/observe/metrics")) {
    return {
      title: "Metrics — LynkTrace",
      description: "Real-time CPU, memory, event loop lag, and system metrics.",
    };
  }
  if (cleanPath.includes("/observe/traces")) {
    return {
      title: "Traces & Spans — LynkTrace",
      description: "Distributed trace waterfalls and dependency graph inspection.",
    };
  }
  if (cleanPath.includes("/observe/logs")) {
    return {
      title: "Live Logs — LynkTrace",
      description: "Streaming structured log aggregation and full-text filter pipeline.",
    };
  }
  if (cleanPath.includes("/observe/requests")) {
    return {
      title: "API Requests — LynkTrace",
      description: "Inspect HTTP status codes, durations, headers, and payload sizes.",
    };
  }
  if (cleanPath.includes("/observe/profiling")) {
    return {
      title: "Continuous Profiling — LynkTrace",
      description: "Flamegraphs and call-tree analysis for hot CPU paths.",
    };
  }
  if (cleanPath.includes("/observe/errors")) {
    return {
      title: "Error Tracking — LynkTrace",
      description: "Fingerprinted error groups, stack traces, and regression alerts.",
    };
  }
  if (cleanPath.includes("/admin/members") || cleanPath.includes("/admin/team") || cleanPath.includes("/team/members")) {
    return {
      title: "Members — LynkTrace",
      description: "Invite members and configure role-based access controls.",
    };
  }
  if (cleanPath.includes("/team/settings") || cleanPath.includes("/team/profile")) {
    return {
      title: "Organization Settings — LynkTrace",
      description: "Manage organization name, slug, security policies, and billing.",
    };
  }
  if (cleanPath.includes("/team/billing")) {
    return {
      title: "Billing & Usage — LynkTrace",
      description: "Track event ingestion volume, plan limits, and payment methods.",
    };
  }
  if (cleanPath.includes("/team/security") || cleanPath.includes("/team/audit")) {
    return {
      title: "Audit & Security — LynkTrace",
      description: "Tamper-evident audit logs and security event timeline.",
    };
  }
  if (cleanPath.includes("/team/sso") || cleanPath.includes("/team/domains")) {
    return {
      title: "Enterprise SSO & Domains — LynkTrace",
      description: "Configure SAML, SCIM provisioning, and verified domain routing.",
    };
  }

  return {
    title: "LynkTrace — AI-powered API Observability",
    description: "LynkTrace — Enterprise AI-powered API observability and telemetry platform. Real-time metrics, tracing, distributed error tracking, and automated incident response.",
  };
}

export function DocumentHeadManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = resolveRouteMeta(pathname);
    document.title = meta.title;

    // Update meta description
    let descTag = document.querySelector('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement("meta");
      descTag.setAttribute("name", "description");
      document.head.appendChild(descTag);
    }
    descTag.setAttribute("content", meta.description);

    // Update og:title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute("content", meta.title);
    }

    // Update og:description
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute("content", meta.description);
    }
  }, [pathname]);

  return null;
}
