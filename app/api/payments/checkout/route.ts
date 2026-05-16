import { PrismaPaymentRepository } from "@/lib/repositories/payment.repository";
import { assertSameOrigin, requireUserContext } from "@/lib/security/access-control";
import { writeAuditLog } from "@/lib/security/audit-log";
import { safeJsonResponse, withErrorHandling } from "@/lib/security/errors";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rate-limit";
import { PaymentService } from "@/lib/services/payment.service";
import { createCheckoutSchema } from "@/lib/validators/payment";

const service = new PaymentService(new PrismaPaymentRepository());

export const POST = withErrorHandling(async (request: Request) => {
  assertSameOrigin(request);
  const currentUser = requireUserContext(request, ["PATIENT"]);
  await enforceRateLimit({ scope: "payment-checkout", request, userId: currentUser.userId, ...rateLimitPolicies.providerCheckout });

  const payload = createCheckoutSchema.parse(await request.json());
  const result = await service.createCheckoutSession({ appointmentId: payload.appointmentId, userId: currentUser.userId });
  writeAuditLog({ eventType: "PAYMENT_CHECKOUT_CREATED", actor: currentUser, resourceType: "payment", resourceId: result.paymentId, action: "payment.checkout.create", result: "SUCCESS", requestId: request.headers.get("x-request-id") });

  return safeJsonResponse(result, 201);
});
