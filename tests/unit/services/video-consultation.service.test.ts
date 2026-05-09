import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CurrentUser } from "@/lib/auth/current-user";
import { AppError } from "@/lib/security/errors";
import {
  CloudflareStreamWebRtcAdapter,
  generateVideoRoomId,
  verifyVideoRoomToken,
  VideoConsultationService,
  type VideoConsultationAppointment,
  type VideoConsultationRepository,
} from "@/lib/services/video-consultation.service";

const baseAppointment: VideoConsultationAppointment = {
  id: "apt_video_1",
  patientId: "patient_1",
  practitionerId: "prac_1",
  consultationType: "VIDEO",
  status: "CONFIRMED",
  startTime: "2026-05-09T10:00:00.000Z",
  endTime: "2026-05-09T10:30:00.000Z",
};

const patient: CurrentUser = { userId: "patient_1", role: "PATIENT", source: "demo-headers" };
const practitioner: CurrentUser = { userId: "prac_1", role: "PRACTITIONER", source: "demo-headers" };
const admin: CurrentUser = { userId: "admin_1", role: "ADMIN", source: "demo-headers" };

function createRepository(appointment: VideoConsultationAppointment | null = baseAppointment): VideoConsultationRepository {
  return { findAppointmentById: vi.fn(async () => appointment) };
}

function createService(appointment: VideoConsultationAppointment | null = baseAppointment) {
  return new VideoConsultationService(
    createRepository(appointment),
    new CloudflareStreamWebRtcAdapter({ joinBaseUrl: "https://video.test/rooms" }),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-09T09:50:00.000Z"));
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("VideoConsultationService", () => {
  it("rejects unauthenticated users", async () => {
    await expect(createService().getRoomAccess({ appointmentId: "apt_video_1", currentUser: null })).rejects.toMatchObject({ code: "UNAUTHENTICATED" } satisfies Partial<AppError>);
  });

  it("rejects the wrong patient", async () => {
    await expect(createService().getRoomAccess({ appointmentId: "apt_video_1", currentUser: { ...patient, userId: "patient_2" } })).rejects.toMatchObject({ code: "VIDEO_ACCESS_DENIED" } satisfies Partial<AppError>);
  });

  it("rejects the wrong practitioner", async () => {
    await expect(createService().getRoomAccess({ appointmentId: "apt_video_1", currentUser: { ...practitioner, userId: "prac_2" } })).rejects.toMatchObject({ code: "VIDEO_ACCESS_DENIED" } satisfies Partial<AppError>);
  });

  it("allows admin access", async () => {
    const result = await createService().getRoomAccess({ appointmentId: "apt_video_1", currentUser: admin });

    expect(result.access.provider).toBe("CLOUDFLARE_STREAM_WEBRTC");
    expect(result.access.roomId).toBe(generateVideoRoomId("apt_video_1"));
    expect(result.access.roomId).not.toContain("apt_video_1");
  });

  it("rejects cancelled appointments", async () => {
    await expect(createService({ ...baseAppointment, status: "CANCELLED" }).getRoomAccess({ appointmentId: "apt_video_1", currentUser: patient })).rejects.toMatchObject({ code: "APPOINTMENT_NOT_JOINABLE" } satisfies Partial<AppError>);
  });

  it("rejects non-video appointments", async () => {
    await expect(createService({ ...baseAppointment, consultationType: "IN_PERSON" }).getRoomAccess({ appointmentId: "apt_video_1", currentUser: patient })).rejects.toMatchObject({ code: "VIDEO_CONSULTATION_REQUIRED" } satisfies Partial<AppError>);
  });

  it("rejects expired tokens", async () => {
    const result = await createService().getRoomAccess({ appointmentId: "apt_video_1", currentUser: patient });

    expect(() => verifyVideoRoomToken(result.access.roomToken, { now: new Date("2026-05-09T09:56:00.000Z") })).toThrow(AppError);
    expect(() => verifyVideoRoomToken(result.access.roomToken, { now: new Date("2026-05-09T09:56:00.000Z") })).toThrow("Video room token has expired");
  });

  it("stores audit events without logging tokens or PHI", async () => {
    const info = vi.mocked(console.info);

    const result = await createService().getRoomAccess({ appointmentId: "apt_video_1", currentUser: patient });

    expect(info).toHaveBeenCalled();
    const logged = info.mock.calls.map((call) => String(call[0])).join("\n");
    expect(logged).toContain("video_consultation.join_attempt");
    expect(logged).not.toContain(result.access.roomToken);
    expect(logged).not.toContain("patient_1");
    expect(logged).not.toContain("prac_1");
  });
});
