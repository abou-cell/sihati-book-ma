import { AppointmentError, AppointmentService } from "@/lib/services/appointment.service";
import { PrismaAppointmentRepository } from "@/lib/repositories/appointment.repository";
import { assertSameOrigin, requireUserContext } from "@/lib/security/access-control";
import { writeAuditLog } from "@/lib/security/audit-log";
import { AppError, safeJsonResponse, withErrorHandling } from "@/lib/security/errors";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rate-limit";
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
  assertSameOrigin(request);
  const currentUser = requireUserContext(request, ["PATIENT"]);
  const { userId } = currentUser;

  await enforceRateLimit({ scope: "appointment-create", request, userId, ...rateLimitPolicies.appointmentCreate });

  const body = await request.json();
  const payload = createAppointmentSchema.parse(body);

  try {
    const result = await service.createAppointment(payload, userId);
    writeAuditLog({ eventType: "APPOINTMENT_CREATED", actor: currentUser, resourceType: "appointment", resourceId: result.appointmentId, action: "appointment.create", result: "SUCCESS", requestId: request.headers.get("x-request-id") });
    return safeJsonResponse(result, 201);
  } catch (error) {
    if (error instanceof AppointmentError) {
      throw new AppError(error.code, appointmentErrorStatus[error.code] ?? 409, error.message);
    }

    throw error;
  }
});
