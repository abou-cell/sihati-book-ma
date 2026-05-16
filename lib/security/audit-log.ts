import type { CurrentUser } from "@/lib/auth/current-user";
import type { UserRole } from "@/lib/auth/permissions";

export type AuditEventType =
  | "AUTH_SUCCESS"
  | "AUTH_FAILURE"
  | "ACCESS_DENIED"
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_CANCELLED"
  | "VIDEO_JOIN_ATTEMPT"
  | "MEDICAL_DOCUMENT_UPLOADED"
  | "MEDICAL_DOCUMENT_DOWNLOADED"
  | "PAYMENT_CHECKOUT_CREATED"
  | "PAYMENT_WEBHOOK_RECEIVED"
  | "ADMIN_SERVICE_CONFIG_CHANGED";

export type AuditResult = "SUCCESS" | "FAILURE" | "DENIED" | "RECEIVED";

export type AuditResourceType =
  | "auth_session"
  | "appointment"
  | "video_consultation"
  | "medical_document"
  | "payment"
  | "payment_webhook"
  | "service_configuration";

export type AuditEvent = {
  eventType: AuditEventType;
  actor?: Pick<CurrentUser, "userId" | "role"> | null;
  actorUserId?: string | null;
  actorRole?: UserRole | null;
  resourceType?: AuditResourceType | null;
  resourceId?: string | null;
  action?: string | null;
  result: AuditResult;
  requestId?: string | null;
  timestamp?: string | Date | null;
};

export type AuditLogPayload = {
  level: "info";
  type: "audit";
  eventType: AuditEventType;
  actorUserId?: string;
  actorRole?: UserRole;
  resourceType?: AuditResourceType;
  resourceId?: string;
  action?: string;
  result: AuditResult;
  timestamp: string;
  requestId?: string;
};

const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|setCookie|password|passwd|secret|token|apiKey|api[-_]?key|accessKey|access[-_]?key|privateKey|private[-_]?key|signature|signedUrl|signed[-_]?url|rawBody|raw[-_]?body|webhookBody|webhook[-_]?body|decrypted|email|phone|address|dob|birth|fullName|fileName|file[-_]?name|diagnosis|notes?|reason)/i;

const SENSITIVE_QUERY_PARAMS = new Set([
  "token",
  "signature",
  "sig",
  "expires",
  "x-amz-signature",
  "x-amz-credential",
  "x-amz-security-token",
  "x-amz-expires",
  "x-goog-signature",
  "x-goog-credential",
  "x-goog-expires",
  "checkout_session_id",
  "payment_intent_client_secret",
]);

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/g;

function normalizeAuditString(value: string): string | undefined {
  const trimmed = redactSignedUrl(value).replace(BEARER_PATTERN, "Bearer [REDACTED]").trim();
  return trimmed ? trimmed.slice(0, 256) : undefined;
}

function serializeTimestamp(timestamp?: string | Date | null): string {
  if (timestamp instanceof Date) return timestamp.toISOString();
  if (typeof timestamp === "string" && timestamp.trim()) return timestamp;
  return new Date().toISOString();
}

function hasSensitiveQueryParam(url: URL): boolean {
  for (const key of url.searchParams.keys()) {
    if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) return true;
  }
  return false;
}

export function redactSignedUrl(value: string): string {
  try {
    const url = new URL(value);
    if (!hasSensitiveQueryParam(url)) return value;

    for (const key of Array.from(url.searchParams.keys())) {
      if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) {
        url.searchParams.set(key, "[REDACTED]");
      }
    }
    return url.toString();
  } catch {
    return value;
  }
}

export function redactForAudit<T>(value: T): T | "[REDACTED]" {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    const redacted = redactSignedUrl(value)
      .replace(BEARER_PATTERN, "Bearer [REDACTED]")
      .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]")
      .replace(PHONE_PATTERN, "[REDACTED_PHONE]");
    return redacted as T;
  }

  if (typeof value !== "object") return value;

  if (value instanceof Headers) {
    const result: Record<string, unknown> = {};
    value.forEach((headerValue, key) => {
      result[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : redactForAudit(headerValue);
    });
    return result as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactForAudit(entry)) as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : redactForAudit(entry);
  }
  return result as T;
}

export function buildAuditLogPayload(event: AuditEvent): AuditLogPayload {
  const actorUserId = normalizeAuditString(event.actorUserId ?? event.actor?.userId ?? "");
  const resourceId = normalizeAuditString(event.resourceId ?? "");
  const action = normalizeAuditString(event.action ?? "");
  const requestId = normalizeAuditString(event.requestId ?? "");

  return {
    level: "info",
    type: "audit",
    eventType: event.eventType,
    ...(actorUserId ? { actorUserId } : {}),
    ...(event.actorRole ?? event.actor?.role ? { actorRole: (event.actorRole ?? event.actor?.role) as UserRole } : {}),
    ...(event.resourceType ? { resourceType: event.resourceType } : {}),
    ...(resourceId ? { resourceId } : {}),
    ...(action ? { action } : {}),
    result: event.result,
    timestamp: serializeTimestamp(event.timestamp),
    ...(requestId ? { requestId } : {}),
  };
}

export function writeAuditLog(event: AuditEvent): void {
  console.info(JSON.stringify(buildAuditLogPayload(event)));
}
