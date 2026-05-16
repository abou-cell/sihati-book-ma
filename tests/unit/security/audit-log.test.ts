import { afterEach, describe, expect, it, vi } from "vitest";

import { buildAuditLogPayload, redactForAudit, redactSignedUrl, writeAuditLog } from "@/lib/security/audit-log";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("audit log redaction", () => {
  it("redacts secrets, tokens, cookies, PHI-shaped values, raw webhook bodies, and signed URL parameters", () => {
    const redacted = redactForAudit({
      authorization: "Bearer secret.jwt.token",
      cookie: "sihati_session=v1.payload.signature",
      patientEmail: "patient@example.com",
      patientPhone: "+212 612-345-678",
      webhookRawBody: "{\"fullName\":\"Sensitive Patient\"}",
      nested: {
        apiKey: "sk_test_123",
        downloadUrl: "https://storage.test/doc.pdf?signature=abc&expires=123&safe=value",
      },
      safe: "appointment_created",
    });

    expect(redacted).toMatchObject({
      authorization: "[REDACTED]",
      cookie: "[REDACTED]",
      patientEmail: "[REDACTED]",
      patientPhone: "[REDACTED]",
      webhookRawBody: "[REDACTED]",
      nested: {
        apiKey: "[REDACTED]",
        downloadUrl: "https://storage.test/doc.pdf?signature=%5BREDACTED%5D&expires=%5BREDACTED%5D&safe=value",
      },
      safe: "appointment_created",
    });
  });

  it("redacts only signing parameters when a string is a signed URL", () => {
    expect(redactSignedUrl("https://files.test/document.pdf?signature=abc&token=def&mode=download")).toBe(
      "https://files.test/document.pdf?signature=%5BREDACTED%5D&token=%5BREDACTED%5D&mode=download",
    );
  });
});

describe("structured audit events", () => {
  it("builds representative medical document audit events with only allow-listed metadata", () => {
    const payload = buildAuditLogPayload({
      eventType: "MEDICAL_DOCUMENT_UPLOADED",
      actorUserId: "patient_1",
      actorRole: "PATIENT",
      resourceType: "medical_document",
      resourceId: "doc_1",
      action: "medical_document.upload",
      result: "SUCCESS",
      requestId: "req_1",
      timestamp: "2026-05-16T00:00:00.000Z",
    });

    expect(payload).toEqual({
      level: "info",
      type: "audit",
      eventType: "MEDICAL_DOCUMENT_UPLOADED",
      actorUserId: "patient_1",
      actorRole: "PATIENT",
      resourceType: "medical_document",
      resourceId: "doc_1",
      action: "medical_document.upload",
      result: "SUCCESS",
      timestamp: "2026-05-16T00:00:00.000Z",
      requestId: "req_1",
    });
  });

  it("writes payment webhook audit events without raw webhook bodies or signatures", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    writeAuditLog({
      eventType: "PAYMENT_WEBHOOK_RECEIVED",
      resourceType: "payment_webhook",
      resourceId: "evt_1",
      action: "checkout.session.completed",
      result: "RECEIVED",
      requestId: "req_webhook",
      timestamp: "2026-05-16T00:00:00.000Z",
    });

    expect(info).toHaveBeenCalledOnce();
    const logged = JSON.parse(String(info.mock.calls[0]?.[0]));
    expect(logged).toMatchObject({ eventType: "PAYMENT_WEBHOOK_RECEIVED", resourceId: "evt_1", result: "RECEIVED" });
    expect(logged).not.toHaveProperty("rawBody");
    expect(logged).not.toHaveProperty("signature");
  });
});
