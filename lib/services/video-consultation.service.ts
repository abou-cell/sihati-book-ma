import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import type { CurrentUser } from "@/lib/auth/current-user";
import { serverEnv } from "@/lib/env";
import { writeAuditLog } from "@/lib/security/audit-log";
import { AppError } from "@/lib/security/errors";
import type { ServiceProvider } from "@/lib/validators/service-config";

export type VideoAppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type VideoConsultationAppointment = {
  id: string;
  patientId: string;
  practitionerId: string;
  consultationType: "IN_PERSON" | "VIDEO";
  status: VideoAppointmentStatus;
  startTime: string;
  endTime: string;
  patient?: { fullName: string; email: string };
  practitioner?: { fullName: string; specialty: string; email?: string | null };
};

export type VideoConsultationRepository = {
  findAppointmentById(id: string): Promise<VideoConsultationAppointment | null>;
};

export type RoomTokenPayload = {
  version: 1;
  roomId: string;
  appointmentIdHash: string;
  actorId: string;
  actorRole: CurrentUser["role"];
  provider: ServiceProvider;
  iat: number;
  exp: number;
  nonce: string;
};

export type VideoRoomAccess = {
  provider: ServiceProvider;
  roomId: string;
  roomToken: string;
  tokenExpiresAt: string;
  joinUrl: string;
  embedUrl: string;
};

export type VideoProviderAdapter = {
  provider: ServiceProvider;
  createRoomAccess(input: { roomId: string; roomToken: string; expiresAt: Date }): VideoRoomAccess;
};

type GetRoomAccessInput = {
  appointmentId: string;
  currentUser: CurrentUser | null;
  now?: Date;
  requestId?: string | null;
};

const ROOM_ID_VERSION = "v1";
const ROOM_TOKEN_VERSION = "v1";
const TOKEN_TTL_SECONDS = 5 * 60;
const ACCESS_OPEN_MINUTES = 15;
const ACCESS_EXPIRE_HOURS = 2;
const REFUSED_STATUSES: readonly VideoAppointmentStatus[] = ["CANCELLED", "COMPLETED"];

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSigningSecret(): string {
  const secret = serverEnv.AUTH_SECRET ?? serverEnv.MEDICAL_DOCUMENTS_SIGNING_SECRET;
  if (secret) return secret;

  if (serverEnv.NODE_ENV === "production") {
    throw new AppError("VIDEO_SIGNING_SECRET_MISSING", 500, "Video consultation signing is not configured", undefined, false);
  }

  return "development-video-consultation-signing-secret-change-before-production";
}

function sign(value: string): string {
  return createHmac("sha256", getSigningSecret()).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function hashIdentifier(value: string): string {
  return createHmac("sha256", getSigningSecret()).update(value).digest("base64url").slice(0, 32);
}

export function generateVideoRoomId(appointmentId: string): string {
  return `sihati-${ROOM_ID_VERSION}-${hashIdentifier(`room:${appointmentId}`)}`;
}

function createRoomToken(payload: RoomTokenPayload): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${ROOM_TOKEN_VERSION}.${encodedPayload}`;
  return `${unsignedToken}.${sign(unsignedToken)}`;
}

export function verifyVideoRoomToken(token: string, options: { now?: Date } = {}): RoomTokenPayload {
  const [version, encodedPayload, signature] = token.split(".");
  if (version !== ROOM_TOKEN_VERSION || !encodedPayload || !signature) {
    throw new AppError("VIDEO_ROOM_TOKEN_INVALID", 401, "Video room token is invalid");
  }

  const unsignedToken = `${version}.${encodedPayload}`;
  if (!safeEqual(signature, sign(unsignedToken))) {
    throw new AppError("VIDEO_ROOM_TOKEN_INVALID", 401, "Video room token is invalid");
  }

  let payload: RoomTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as RoomTokenPayload;
  } catch {
    throw new AppError("VIDEO_ROOM_TOKEN_INVALID", 401, "Video room token is invalid");
  }

  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);
  if (!payload || payload.version !== 1 || typeof payload.exp !== "number" || payload.exp <= nowSeconds) {
    throw new AppError("VIDEO_ROOM_TOKEN_EXPIRED", 401, "Video room token has expired");
  }

  return payload;
}

function isAuthorized(currentUser: CurrentUser, appointment: VideoConsultationAppointment): boolean {
  if (currentUser.role === "ADMIN") return true;
  if (currentUser.role === "PATIENT") return currentUser.userId === appointment.patientId;
  if (currentUser.role === "PRACTITIONER") return currentUser.userId === appointment.practitionerId;
  return false;
}

function assertJoinableAppointment(appointment: VideoConsultationAppointment, now: Date): void {
  if (appointment.consultationType !== "VIDEO") {
    throw new AppError("VIDEO_CONSULTATION_REQUIRED", 400, "Appointment is not a video consultation");
  }

  if (REFUSED_STATUSES.includes(appointment.status)) {
    throw new AppError("APPOINTMENT_NOT_JOINABLE", 409, "Appointment cannot be joined");
  }

  if (appointment.status !== "CONFIRMED") {
    throw new AppError("APPOINTMENT_NOT_CONFIRMED", 409, "Appointment is not confirmed");
  }

  const endTime = new Date(appointment.endTime);
  const accessExpire = new Date(endTime.getTime() + ACCESS_EXPIRE_HOURS * 60 * 60_000);
  if (Number.isNaN(endTime.getTime()) || now > accessExpire) {
    throw new AppError("APPOINTMENT_EXPIRED", 410, "Appointment access window has expired");
  }
}

export class CloudflareStreamWebRtcAdapter implements VideoProviderAdapter {
  readonly provider = "CLOUDFLARE_STREAM_WEBRTC" as const;

  constructor(private readonly options: { joinBaseUrl?: string } = {}) {}

  createRoomAccess(input: { roomId: string; roomToken: string; expiresAt: Date }): VideoRoomAccess {
    const joinBaseUrl = this.options.joinBaseUrl ?? "https://video.sihati.local/rooms";
    const joinUrl = `${joinBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(input.roomId)}?token=${encodeURIComponent(input.roomToken)}`;

    return {
      provider: this.provider,
      roomId: input.roomId,
      roomToken: input.roomToken,
      tokenExpiresAt: input.expiresAt.toISOString(),
      joinUrl,
      embedUrl: joinUrl,
    };
  }
}

export class VideoConsultationService {
  constructor(
    private readonly repository: VideoConsultationRepository,
    private readonly providerAdapter: VideoProviderAdapter = new CloudflareStreamWebRtcAdapter(),
  ) {}

  async getRoomAccess(input: GetRoomAccessInput): Promise<{ appointment: VideoConsultationAppointment; access: VideoRoomAccess; accessStart: string; accessExpires: string; isTooEarly: boolean }> {
    const now = input.now ?? new Date();
    const auditBase = { actor: input.currentUser ?? undefined, appointmentId: input.appointmentId, requestId: input.requestId };

    try {
      if (!input.currentUser) {
        throw new AppError("UNAUTHENTICATED", 401, "Authentication required");
      }

      const appointment = await this.repository.findAppointmentById(input.appointmentId);
      if (!appointment) {
        throw new AppError("APPOINTMENT_NOT_FOUND", 404, "Appointment not found");
      }

      if (!isAuthorized(input.currentUser, appointment)) {
        throw new AppError("VIDEO_ACCESS_DENIED", 403, "Access denied");
      }

      assertJoinableAppointment(appointment, now);

      const startTime = new Date(appointment.startTime);
      const endTime = new Date(appointment.endTime);
      const accessStart = new Date(startTime.getTime() - ACCESS_OPEN_MINUTES * 60_000);
      const accessExpires = new Date(endTime.getTime() + ACCESS_EXPIRE_HOURS * 60 * 60_000);
      const isTooEarly = now < accessStart;
      const roomId = generateVideoRoomId(appointment.id);
      const issuedAt = Math.floor(now.getTime() / 1000);
      const expiresAt = new Date(now.getTime() + TOKEN_TTL_SECONDS * 1000);
      const roomToken = createRoomToken({
        version: 1,
        roomId,
        appointmentIdHash: hashIdentifier(`appointment:${appointment.id}`),
        actorId: input.currentUser.userId,
        actorRole: input.currentUser.role,
        provider: this.providerAdapter.provider,
        iat: issuedAt,
        exp: Math.floor(expiresAt.getTime() / 1000),
        nonce: randomUUID(),
      });

      const access = this.providerAdapter.createRoomAccess({ roomId, roomToken, expiresAt });
      writeAuditLog({ ...auditBase, action: "video_consultation.join_attempt", patientId: appointment.patientId, practitionerId: appointment.practitionerId, reason: "allowed" });

      return { appointment, access, accessStart: accessStart.toISOString(), accessExpires: accessExpires.toISOString(), isTooEarly };
    } catch (error) {
      writeAuditLog({ ...auditBase, action: "video_consultation.join_attempt", reason: error instanceof AppError ? error.code : "UNKNOWN" });
      throw error;
    }
  }
}
