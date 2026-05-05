import { z } from "zod";

export const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export const CONSULTATION_TYPES = ["IN_PERSON", "VIDEO"] as const;

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const consultationTypeSchema = z.enum(CONSULTATION_TYPES);
export const weekdaySchema = z.enum(WEEKDAYS);

export const availabilityRuleSchema = z
  .object({
    id: z.string().min(1),
    practitionerId: z.string().min(1),
    weekday: weekdaySchema,
    startTime: z.string().regex(timeRegex, "Invalid start time format (HH:mm)"),
    endTime: z.string().regex(timeRegex, "Invalid end time format (HH:mm)"),
    breakStart: z.string().regex(timeRegex, "Invalid break start format (HH:mm)").optional(),
    breakEnd: z.string().regex(timeRegex, "Invalid break end format (HH:mm)").optional(),
    consultationType: consultationTypeSchema,
    isActive: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.endTime <= value.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time",
        path: ["endTime"],
      });
    }

    const hasOneBreakField = Boolean(value.breakStart) !== Boolean(value.breakEnd);
    if (hasOneBreakField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Both break start and break end must be provided together",
        path: ["breakStart"],
      });
    }

    if (value.breakStart && value.breakEnd) {
      if (value.breakStart <= value.startTime || value.breakEnd >= value.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Break must be strictly inside working hours",
          path: ["breakStart"],
        });
      }

      if (value.breakEnd <= value.breakStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Break end must be after break start",
          path: ["breakEnd"],
        });
      }
    }
  });

export const blockedDateSchema = z.object({
  id: z.string().min(1),
  practitionerId: z.string().min(1),
  date: z.string().date(),
  reason: z.string().max(300).optional(),
});

export const availabilityDateRangeSchema = z
  .object({
    from: z.string().date(),
    to: z.string().date(),
  })
  .refine((value) => value.from <= value.to, {
    message: "Date range start must be before or equal to date range end",
    path: ["to"],
  });

export const slotQuerySchema = z.object({
  practitionerId: z.string().min(1),
  reasonId: z.string().min(1),
  dateRange: availabilityDateRangeSchema,
  consultationType: consultationTypeSchema,
});

export type ConsultationType = z.infer<typeof consultationTypeSchema>;
export type Weekday = z.infer<typeof weekdaySchema>;
export type AvailabilityRule = z.infer<typeof availabilityRuleSchema>;
export type BlockedDate = z.infer<typeof blockedDateSchema>;
export type AvailabilityDateRange = z.infer<typeof availabilityDateRangeSchema>;
export type SlotQuery = z.infer<typeof slotQuerySchema>;
