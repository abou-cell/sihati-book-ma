import { z } from "zod";

export const createCheckoutSchema = z.object({
  appointmentId: z.string().min(1, "appointmentId is required"),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
