import { AppointmentError, AppointmentService } from "@/lib/services/appointment.service";
import { PrismaAppointmentRepository } from "@/lib/repositories/appointment.repository";
import { getUserContext, requireRole } from "@/lib/security/access-control";
import { AppError, safeJsonResponse, withErrorHandling } from "@/lib/security/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { createAppointmentSchema } from "@/lib/validators/appointment";

const service = new AppointmentService(new PrismaAppointmentRepository());

const appointmentErrorStatus: Record<string, number> = {
  PRACTITIONER_NOT_BOOKABLE: 404,
  INVALID_REASON: 400,
  VIDEO_NOT_ALLOWED: 400,
  INVALID_START_TIME: 400,
  SLOT_NOT_AVAILABLE: 409,
  APPOINTMENT_CREATE_FAILED: 500,
};

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
      throw new AppError(error.code, appointmentErrorStatus[error.code] ?? 409, error.message);
    }

    throw error;
  }
});
