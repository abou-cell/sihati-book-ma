import { createAppointmentSchema, type CreateAppointmentInput } from "@/lib/validators/appointment";

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

type Practitioner = { id: string; isVerified: boolean; name: string; specialty: string; city: string };
type ConsultationReason = {
  id: string;
  practitionerId: string;
  label: string;
  inPersonPrice: number;
  videoPrice: number | null;
  isVideoEnabled: boolean;
  slotDurationMinutes: number;
};
type Appointment = {
  id: string;
  patientId: string;
  practitionerId: string;
  reasonId: string;
  consultationType: "IN_PERSON" | "VIDEO";
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
};

type Notification = { id: string; appointmentId: string; channel: "PUSH" | "EMAIL"; status: "PENDING" };

export class AppointmentError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

type AppointmentRepository = {
  getPractitionerById(id: string): Promise<Practitioner | null>;
  getReasonById(id: string): Promise<ConsultationReason | null>;
  findActiveAppointmentBySlot(practitionerId: string, startTime: string): Promise<Appointment | null>;
  createAppointment(input: Omit<Appointment, "id">): Promise<Appointment>;
  createNotification(input: Omit<Notification, "id">): Promise<Notification>;
};

export class AppointmentService {
  constructor(private readonly repository: AppointmentRepository) {}

  async createAppointment(input: CreateAppointmentInput, patientId: string) {
    const parsed = createAppointmentSchema.parse(input);

    const practitioner = await this.repository.getPractitionerById(parsed.practitionerId);
    if (!practitioner || !practitioner.isVerified) {
      throw new AppointmentError("PRACTITIONER_NOT_BOOKABLE", "Practitioner cannot be booked");
    }

    const reason = await this.repository.getReasonById(parsed.reasonId);
    if (!reason || reason.practitionerId !== parsed.practitionerId) {
      throw new AppointmentError("INVALID_REASON", "Consultation reason is invalid for selected practitioner");
    }

    if (parsed.consultationType === "VIDEO" && !reason.isVideoEnabled) {
      throw new AppointmentError("VIDEO_NOT_ALLOWED", "Selected reason does not allow video consultation");
    }

    const startsAt = new Date(parsed.startTime);
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
      throw new AppointmentError("INVALID_START_TIME", "Cannot book a past slot");
    }

    const existing = await this.repository.findActiveAppointmentBySlot(parsed.practitionerId, parsed.startTime);
    if (existing) {
      throw new AppointmentError("SLOT_NOT_AVAILABLE", "Selected slot is already booked");
    }

    const endsAt = new Date(startsAt.getTime() + reason.slotDurationMinutes * 60_000).toISOString();
    const status: AppointmentStatus = parsed.consultationType === "IN_PERSON" ? "CONFIRMED" : "PENDING";

    const created = await this.repository.createAppointment({
      patientId,
      practitionerId: parsed.practitionerId,
      reasonId: parsed.reasonId,
      consultationType: parsed.consultationType,
      startTime: parsed.startTime,
      endTime: endsAt,
      status,
    });

    await this.repository.createNotification({
      appointmentId: created.id,
      channel: "PUSH",
      status: "PENDING",
    });

    return { appointmentId: created.id, status: created.status };
  }
}
