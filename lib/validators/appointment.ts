import { z } from "zod";

export const appointmentConsultationTypeSchema = z.enum(["IN_PERSON", "VIDEO"]);

export const createAppointmentSchema = z.object({
  practitionerId: z.string().min(1, "practitionerId is required"),
  reasonId: z.string().min(1, "reasonId is required"),
  consultationType: appointmentConsultationTypeSchema,
  startTime: z.string().datetime({ offset: true, message: "startTime must be a valid ISO datetime" }),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
