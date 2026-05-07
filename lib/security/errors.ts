import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
    public readonly exposeDetails = process.env.NODE_ENV !== "production",
  ) {
    super(message);
  }
}

function serializeUnknownError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(process.env.NODE_ENV === "production" ? {} : { stack: error.stack }),
    };
  }

  return { message: "Unknown error", raw: process.env.NODE_ENV === "production" ? undefined : String(error) };
}

export function logError(error: unknown, context: { path: string; method: string; requestId: string }) {
  const payload = {
    level: "error",
    path: context.path,
    method: context.method,
    requestId: context.requestId,
    timestamp: new Date().toISOString(),
    error: serializeUnknownError(error),
  };

  console.error(JSON.stringify(payload));
}

export function safeJsonResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

function safeValidationDetails(error: ZodError) {
  return process.env.NODE_ENV === "production" ? undefined : error.flatten();
}

export function withErrorHandling(
  handler: (request: Request, context?: { params?: Promise<Record<string, string>> }) => Promise<NextResponse>
) {
  return async (request: Request, context?: { params?: Promise<Record<string, string>> }) => {
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

    try {
      const response = await handler(request, context);
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (error) {
      logError(error, {
        path: new URL(request.url).pathname,
        method: request.method,
        requestId,
      });

      if (error instanceof ZodError) {
        const details = safeValidationDetails(error);

        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Request validation failed",
              ...(details ? { details } : {}),
            },
          },
          { status: 400, headers: { "x-request-id": requestId } }
        );
      }

      if (error instanceof AppError) {
        return NextResponse.json(
          {
            error: {
              code: error.code,
              message: error.message,
              ...(error.details && error.exposeDetails ? { details: error.details } : {}),
            },
          },
          { status: error.status, headers: { "x-request-id": requestId } }
        );
      }

      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Unexpected server error",
          },
        },
        { status: 500, headers: { "x-request-id": requestId } }
      );
    }
  };
}
