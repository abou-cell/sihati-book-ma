import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppointmentError, AppointmentService } from "@/lib/services/appointment.service";

type Repository = ConstructorParameters<typeof AppointmentService>[0];

function createRepository(overrides: Partial<Repository> = {}): Repository {
  return {
    getPractitionerById: vi.fn(async () => ({
      id: "prac_1",
      isVerified: true,
      name: "Dr. Sara",
      specialty: "Dermatology",
      city: "Casablanca",
    })),
    getReasonById: vi.fn(async () => ({
      id: "reason_1",
      practitionerId: "prac_1",
      label: "General consultation",
      inPersonPrice: 300,
      videoPrice: 250,
      isVideoEnabled: true,
      slotDurationMinutes: 30,
    })),
    findActiveAppointmentBySlot: vi.fn(async () => null),
    createAppointment: vi.fn(async (input) => ({ id: "apt_1", ...input })),
    createNotification: vi.fn(async (input) => ({ id: "notif_1", ...input })),
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-01T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AppointmentService", () => {
  it("creates confirmed in-person appointments and a placeholder notification", async () => {
    const repository = createRepository();
    const service = new AppointmentService(repository);

    await expect(
      service.createAppointment(
        {
          practitionerId: "prac_1",
          reasonId: "reason_1",
          consultationType: "IN_PERSON",
          startTime: "2026-05-06T10:00:00.000Z",
        },
        "patient_1",
      ),
    ).resolves.toEqual({ appointmentId: "apt_1", status: "CONFIRMED" });

    expect(repository.createAppointment).toHaveBeenCalledWith({
      patientId: "patient_1",
      practitionerId: "prac_1",
      reasonId: "reason_1",
      consultationType: "IN_PERSON",
      startTime: "2026-05-06T10:00:00.000Z",
      endTime: "2026-05-06T10:30:00.000Z",
      status: "CONFIRMED",
    });
    expect(repository.createNotification).toHaveBeenCalledWith({ appointmentId: "apt_1", channel: "PUSH", status: "PENDING" });
  });

  it("creates pending video appointments for future payment flow", async () => {
    const service = new AppointmentService(createRepository());

    await expect(
      service.createAppointment(
        {
          practitionerId: "prac_1",
          reasonId: "reason_1",
          consultationType: "VIDEO",
          startTime: "2026-05-06T10:00:00.000Z",
        },
        "patient_1",
      ),
    ).resolves.toEqual({ appointmentId: "apt_1", status: "PENDING" });
  });

  it("rejects unverified practitioners, invalid reasons, past starts, and booked slots", async () => {
    await expect(
      new AppointmentService(createRepository({ getPractitionerById: vi.fn(async () => ({
        id: "prac_1",
        isVerified: false,
        name: "Dr. Sara",
        specialty: "Dermatology",
        city: "Casablanca",
      })) })).createAppointment(
        { practitionerId: "prac_1", reasonId: "reason_1", consultationType: "IN_PERSON", startTime: "2026-05-06T10:00:00.000Z" },
        "patient_1",
      ),
    ).rejects.toMatchObject({ code: "PRACTITIONER_NOT_BOOKABLE" } satisfies Partial<AppointmentError>);

    await expect(
      new AppointmentService(createRepository({ getReasonById: vi.fn(async () => null) })).createAppointment(
        { practitionerId: "prac_1", reasonId: "missing", consultationType: "IN_PERSON", startTime: "2026-05-06T10:00:00.000Z" },
        "patient_1",
      ),
    ).rejects.toMatchObject({ code: "INVALID_REASON" } satisfies Partial<AppointmentError>);

    await expect(
      new AppointmentService(createRepository()).createAppointment(
        { practitionerId: "prac_1", reasonId: "reason_1", consultationType: "IN_PERSON", startTime: "2026-04-30T10:00:00.000Z" },
        "patient_1",
      ),
    ).rejects.toMatchObject({ code: "INVALID_START_TIME" } satisfies Partial<AppointmentError>);

    await expect(
      new AppointmentService(createRepository({
        findActiveAppointmentBySlot: vi.fn(async () => ({
          id: "apt_existing",
          patientId: "patient_2",
          practitionerId: "prac_1",
          reasonId: "reason_1",
          consultationType: "IN_PERSON" as const,
          startTime: "2026-05-06T10:00:00.000Z",
          endTime: "2026-05-06T10:30:00.000Z",
          status: "CONFIRMED" as const,
        })),
      })).createAppointment(
        { practitionerId: "prac_1", reasonId: "reason_1", consultationType: "IN_PERSON", startTime: "2026-05-06T10:00:00.000Z" },
        "patient_1",
      ),
    ).rejects.toMatchObject({ code: "SLOT_NOT_AVAILABLE" } satisfies Partial<AppointmentError>);
  });
});
