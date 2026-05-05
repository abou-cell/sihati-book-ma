import { AppointmentError, AppointmentService } from "@/lib/services/appointment.service";
import { PrismaAppointmentRepository } from "@/lib/repositories/appointment.repository";
import { getUserContext, requireRole } from "@/lib/security/access-control";
import { AppError, safeJsonResponse, withErrorHandling } from "@/lib/security/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { createAppointmentSchema } from "@/lib/validators/appointment";

const service = new AppointmentService(new PrismaAppointmentRepository());

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
