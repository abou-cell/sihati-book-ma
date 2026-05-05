import { z } from 'zod';

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 10;

const booleanFromQuery = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const optionalTrimmedString = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .optional();

export const practitionerSearchQuerySchema = z
  .object({
    q: optionalTrimmedString,
    specialty: optionalTrimmedString,
    city: optionalTrimmedString,
    video: booleanFromQuery.optional(),
    availableToday: booleanFromQuery.optional(),
    minPrice: z.coerce.number().int().min(0).max(50000).optional(),
    maxPrice: z.coerce.number().int().min(0).max(50000).optional(),
    sort: z
      .enum(['nextAvailable', 'priceAsc', 'priceDesc'])
      .default('nextAvailable'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  })
  .superRefine((value, ctx) => {
    if (
      typeof value.minPrice === 'number' &&
      typeof value.maxPrice === 'number' &&
      value.minPrice > value.maxPrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'minPrice cannot be greater than maxPrice',
        path: ['minPrice'],
      });
    }
  });

export type PractitionerSearchQuery = z.infer<typeof practitionerSearchQuerySchema>;

export const practitionerSearchPaginationConfig = {
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
} as const;
