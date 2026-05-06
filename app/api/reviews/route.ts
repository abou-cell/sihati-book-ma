import { AppError, withErrorHandling } from "@/lib/security/errors";

export const GET = withErrorHandling(async () => {
  throw new AppError(
    "REVIEWS_NOT_IMPLEMENTED",
    501,
    "Practitioner reviews are not backed by persisted production data in this MVP build.",
  );
});
