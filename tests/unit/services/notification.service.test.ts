import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationService, type NotificationRecord, type NotificationRepository } from "@/lib/services/notification.service";

function createRepository() {
  const records: NotificationRecord[] = [];
  const repository: NotificationRepository = {
    createNotification: vi.fn(async (input) => {
      const record: NotificationRecord = { id: `notif_${records.length + 1}`, ...input };
      records.push(record);
      return record;
    }),
  };

  return { repository, records };
}

const context = {
  appointmentId: "apt_1",
  recipientEmail: "patient@example.test",
  patientName: "Amal",
  practitionerName: "Dr. Sara",
  startTimeIso: "2026-05-06T10:00:00.000Z",
  consultationType: "VIDEO" as const,
  videoJoinUrl: "https://meet.example.test/room",
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-01T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("NotificationService", () => {
  it("sends email through the injected sender and persists a sent notification", async () => {
    const { repository } = createRepository();
    const sender = { sendEmail: vi.fn(async () => undefined) };
    const service = new NotificationService(repository, sender);

    const record = await service.sendAppointmentConfirmationPatient(context);

    expect(sender.sendEmail).toHaveBeenCalledWith({
      to: "patient@example.test",
      subject: "Your appointment is confirmed",
      text: expect.stringContaining("Dr. Sara"),
    });
    expect(repository.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      appointmentId: "apt_1",
      channel: "EMAIL",
      type: "APPOINTMENT_CONFIRMATION_PATIENT",
      recipient: "patient@example.test",
      status: "SENT",
      sentAt: "2026-05-01T00:00:00.000Z",
      metadata: {
        consultationType: "VIDEO",
        startTimeIso: "2026-05-06T10:00:00.000Z",
      },
    }));
    expect(record.status).toBe("SENT");
  });

  it("persists failed status when the injected sender rejects", async () => {
    const { repository } = createRepository();
    const sender = { sendEmail: vi.fn(async () => Promise.reject(new Error("provider unavailable"))) };
    const service = new NotificationService(repository, sender);

    const record = await service.sendAppointmentReminder24h(context);

    expect(record.status).toBe("FAILED");
    expect(record.sentAt).toBeNull();
    expect(repository.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: "APPOINTMENT_REMINDER_24H",
      status: "FAILED",
      sentAt: null,
    }));
  });

  it("includes a video join URL only in the video consultation template", async () => {
    const { repository } = createRepository();
    const sender = { sendEmail: vi.fn(async () => undefined) };
    const service = new NotificationService(repository, sender);

    const record = await service.sendVideoConsultationLink(context);

    expect(record.subject).toBe("Video consultation link");
    expect(record.message).toContain("https://meet.example.test/room");
    expect(sender.sendEmail).toHaveBeenCalledOnce();
  });
});
