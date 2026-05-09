import { createHmac, timingSafeEqual } from "node:crypto";

import type { UserRole } from "@/lib/auth/permissions";
import { isUserRole } from "@/lib/auth/permissions";
import { AppError } from "@/lib/security/errors";

export type AuthSessionSource = "signed-session-cookie" | "demo-headers" | "github-pages-preview";

export type AuthSession = {
  userId: string;
  role: UserRole;
  source: AuthSessionSource;
};

type SignedSessionPayload = {
  userId: string;
  role: UserRole;
  iat: number;
  exp: number;
};

const DEMO_USER_ID_HEADER = "x-user-id";
const DEMO_USER_ROLE_HEADER = "x-user-role";
const SESSION_COOKIE_NAME = "sihati_session";
const SESSION_TOKEN_VERSION = "v1";
const MIN_AUTH_SECRET_LENGTH = 32;
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 8;

export const demoSessionHeaderNames = {
  userId: DEMO_USER_ID_HEADER,
  role: DEMO_USER_ROLE_HEADER,
} as const;

export const signedSessionCookieName = SESSION_COOKIE_NAME;

export function isDemoHeaderAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

function normalizeUserId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length > 128) return null;
  return trimmed;
}

function hasDemoSessionHeaders(headers: Headers): boolean {
  return headers.has(DEMO_USER_ID_HEADER) || headers.has(DEMO_USER_ROLE_HEADER);
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();

  if (!secret || secret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new AppError(
      "AUTH_NOT_CONFIGURED",
      503,
      `Authentication is not configured. AUTH_SECRET must be at least ${MIN_AUTH_SECRET_LENGTH} characters.`,
    );
  }

  return secret;
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "base64url");
  const right = Buffer.from(b, "base64url");
  return left.length === right.length && timingSafeEqual(left, right);
}

function parseCookieHeader(cookieHeader: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;

  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex < 0) continue;

    const key = cookie.slice(0, separatorIndex).trim();
    const value = cookie.slice(separatorIndex + 1).trim();
    if (key) cookies.set(key, decodeURIComponent(value));
  }

  return cookies;
}

function validateSignedSessionPayload(payload: unknown): SignedSessionPayload | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as Partial<SignedSessionPayload>;
  const normalizedUserId = normalizeUserId(candidate.userId);
  if (!normalizedUserId || !isUserRole(candidate.role)) return null;
  const iat = candidate.iat;
  const exp = candidate.exp;
  if (!Number.isInteger(iat) || !Number.isInteger(exp)) return null;
  if (typeof iat !== "number" || typeof exp !== "number" || exp <= iat) return null;

  return {
    userId: normalizedUserId,
    role: candidate.role,
    iat,
    exp,
  };
}

function verifySignedSessionToken(token: string | null): AuthSession | null {
  if (!token) return null;

  const [version, encodedPayload, signature] = token.split(".");
  if (version !== SESSION_TOKEN_VERSION || !encodedPayload || !signature) {
    throw new AppError("INVALID_SESSION", 401, "Invalid authentication session");
  }

  const secret = getAuthSecret();
  const expectedSignature = sign(`${version}.${encodedPayload}`, secret);
  if (!constantTimeEqual(signature, expectedSignature)) {
    throw new AppError("INVALID_SESSION", 401, "Invalid authentication session");
  }

  let payload: SignedSessionPayload | null;
  try {
    payload = validateSignedSessionPayload(JSON.parse(base64UrlDecode(encodedPayload)));
  } catch {
    payload = null;
  }

  if (!payload) {
    throw new AppError("INVALID_SESSION", 401, "Invalid authentication session");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    throw new AppError("SESSION_EXPIRED", 401, "Authentication session expired");
  }

  return { userId: payload.userId, role: payload.role, source: "signed-session-cookie" };
}

function readBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new AppError("INVALID_SESSION", 401, "Invalid authentication session");
  }

  return token;
}

function readSignedSessionFromHeaders(headers: Headers): AuthSession | null {
  const bearerToken = readBearerToken(headers);
  const cookieToken = parseCookieHeader(headers.get("cookie")).get(SESSION_COOKIE_NAME) ?? null;
  return verifySignedSessionToken(bearerToken ?? cookieToken);
}

function buildDemoSession(userId: string | null, role: string | null): AuthSession | null {
  const normalizedUserId = normalizeUserId(userId);

  if (!isDemoHeaderAuthEnabled() || !normalizedUserId || !isUserRole(role)) {
    return null;
  }

  return { userId: normalizedUserId, role, source: "demo-headers" };
}

export function readDemoSessionFromRequest(request: Request): AuthSession | null {
  return buildDemoSession(
    request.headers.get(DEMO_USER_ID_HEADER),
    request.headers.get(DEMO_USER_ROLE_HEADER),
  );
}

export function readAuthSessionFromRequest(request: Request): AuthSession | null {
  if (process.env.NODE_ENV === "production" && hasDemoSessionHeaders(request.headers)) {
    throw new AppError("DEMO_AUTH_FORBIDDEN", 400, "Demo authentication headers are not accepted in production");
  }

  const signedSession = readSignedSessionFromHeaders(request.headers);
  if (signedSession) return signedSession;

  return readDemoSessionFromRequest(request);
}

export async function readAuthSessionFromServerHeaders(): Promise<AuthSession | null> {
  if (process.env.GITHUB_PAGES === "true") {
    return { userId: "github_pages_preview_admin", role: "ADMIN", source: "github-pages-preview" };
  }

  const { headers } = await import("next/headers");
  const requestHeaders = await headers();

  if (process.env.NODE_ENV === "production" && hasDemoSessionHeaders(requestHeaders)) {
    throw new AppError("DEMO_AUTH_FORBIDDEN", 400, "Demo authentication headers are not accepted in production");
  }

  const signedSession = readSignedSessionFromHeaders(requestHeaders);
  if (signedSession) return signedSession;

  return buildDemoSession(
    requestHeaders.get(DEMO_USER_ID_HEADER),
    requestHeaders.get(DEMO_USER_ROLE_HEADER),
  );
}

export async function readDemoSessionFromServerHeaders(): Promise<AuthSession | null> {
  return readAuthSessionFromServerHeaders();
}

export function createSignedSessionToken(
  session: Pick<AuthSession, "userId" | "role">,
  options: { now?: Date; ttlSeconds?: number } = {},
): string {
  const normalizedUserId = normalizeUserId(session.userId);
  if (!normalizedUserId || !isUserRole(session.role)) {
    throw new AppError("INVALID_SESSION_PAYLOAD", 400, "Invalid authentication session payload");
  }

  const issuedAt = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const expiresAt = issuedAt + (options.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS);
  const encodedPayload = base64UrlEncode(JSON.stringify({ userId: normalizedUserId, role: session.role, iat: issuedAt, exp: expiresAt } satisfies SignedSessionPayload));
  const unsignedToken = `${SESSION_TOKEN_VERSION}.${encodedPayload}`;

  return `${unsignedToken}.${sign(unsignedToken, getAuthSecret())}`;
}

export function buildSignedSessionCookie(
  session: Pick<AuthSession, "userId" | "role">,
  options: { now?: Date; ttlSeconds?: number; secure?: boolean } = {},
): string {
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
  const token = createSignedSessionToken(session, { now: options.now, ttlSeconds });
  const secure = options.secure ?? process.env.NODE_ENV === "production";
  const attributes = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${ttlSeconds}`,
    ...(secure ? ["Secure"] : []),
  ];

  return attributes.join("; ");
}

export function buildDemoSessionHeaders(session: Pick<AuthSession, "userId" | "role">): Record<string, string> {
  if (!isDemoHeaderAuthEnabled()) return {};

  return {
    [DEMO_USER_ID_HEADER]: session.userId,
    [DEMO_USER_ROLE_HEADER]: session.role,
  };
}
