import { z } from "zod";

import { consultationTypeSchema } from "@/lib/validators/availability";

const MAX_RANGE_DAYS = 30;

export const availableSlotsQuerySchema = z
  .object({
    reasonId: z.string().min(1, "reasonId is required"),
    startDate: z.string().date("startDate must be YYYY-MM-DD"),
    endDate: z.string().date("endDate must be YYYY-MM-DD"),
    consultationType: consultationTypeSchema,
    isPublic: z.coerce.boolean().optional().default(true),
  })
  .superRefine((value, ctx) => {
    const start = new Date(`${value.startDate}T00:00:00.000Z`);
    const end = new Date(`${value.endDate}T00:00:00.000Z`);

    if (end < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endDate must be on or after startDate",
        path: ["endDate"],
      });
      return;
    }

    const diffDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
    if (diffDays > MAX_RANGE_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `date range cannot exceed ${MAX_RANGE_DAYS} days`,
        path: ["endDate"],
      });
    }
  });

export type AvailableSlotsQuery = z.infer<typeof availableSlotsQuerySchema>;
