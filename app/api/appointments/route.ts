import { AppointmentError, AppointmentService } from "@/lib/services/appointment.service";
import { getUserContext, requireRole } from "@/lib/security/access-control";
import { AppError, safeJsonResponse, withErrorHandling } from "@/lib/security/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { createAppointmentSchema } from "@/lib/validators/appointment";

const practitioners = [
  { id: "p_1", isVerified: true, name: "Dr. Sara Alaoui", specialty: "Dermatology", city: "Casablanca" },
  { id: "p_2", isVerified: false, name: "Dr. Ali Karim", specialty: "Cardiology", city: "Rabat" },
];

const reasons = [
  {
    id: "reason_general",
    practitionerId: "p_1",
    label: "General consultation",
    inPersonPrice: 300,
    videoPrice: 250,
    isVideoEnabled: true,
    slotDurationMinutes: 30,
  },
];

const appointments: Array<any> = [];
const notifications: Array<any> = [];

const service = new AppointmentService({
  async getPractitionerById(id) {
    return practitioners.find((item) => item.id === id) ?? null;
  },
  async getReasonById(id) {
    return reasons.find((item) => item.id === id) ?? null;
  },
  async findActiveAppointmentBySlot(practitionerId, startTime) {
    return (
      appointments.find(
        (item) => item.practitionerId === practitionerId && item.startTime === startTime && item.status !== "CANCELLED"
      ) ?? null
    );
  },
  async createAppointment(input) {
    const id = `apt_${appointments.length + 1}`;
    const appointment = { id, ...input };
    const raceCheck = appointments.find(
      (item) => item.practitionerId === input.practitionerId && item.startTime === input.startTime && item.status !== "CANCELLED"
    );

    if (raceCheck) {
      throw new AppointmentError("SLOT_NOT_AVAILABLE", "Selected slot is already booked");
    }

    appointments.push(appointment);
    return appointment;
  },
  async createNotification(input) {
    const notification = { id: `notif_${notifications.length + 1}`, ...input };
    notifications.push(notification);
    return notification;
  },
});

export const POST = withErrorHandling(async (request: Request) => {
  const { userId, role } = getUserContext(request);
  requireRole(role, ["PATIENT"]);

  enforceRateLimit({ key: `booking:${userId}`, limit: 10, windowMs: 60_000 });

  const body = await request.json();
  const payload = createAppointmentSchema.parse(body);

  try {
    const result = await service.createAppointment(payload, userId);
    return safeJsonResponse(result, 201);
  } catch (error) {
    if (error instanceof AppointmentError) {
      throw new AppError(error.code, 409, error.message);
    }

    throw error;
  }
});
