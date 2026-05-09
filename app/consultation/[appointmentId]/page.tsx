import { redirect } from "next/navigation";

import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { PrismaAppointmentRepository } from "@/lib/repositories/appointment.repository";
import { AppError } from "@/lib/security/errors";
import { VideoConsultationService } from "@/lib/services/video-consultation.service";

export const dynamic = "force-dynamic";

const videoConsultationService = new VideoConsultationService(new PrismaAppointmentRepository());

function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" }).format(value instanceof Date ? value : new Date(value));
}

export default async function ConsultationPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  const currentUser = await getCurrentUserFromServer();

  let room;
  try {
    room = await videoConsultationService.getRoomAccess({ appointmentId, currentUser });
  } catch (error) {
    if (error instanceof AppError) redirect("/access-denied");
    throw error;
  }

  const { appointment, access, accessStart, accessExpires, isTooEarly } = room;
  const patientLabel = appointment.patient?.fullName ?? appointment.patientId;
  const practitionerLabel = appointment.practitioner?.fullName ?? appointment.practitionerId;
  const practitionerSpecialty = appointment.practitioner?.specialty ?? "Assigned practitioner";

  return <main className="mx-auto max-w-6xl space-y-6 p-6"><header><h1 className="text-2xl font-semibold">Video consultation</h1><p className="text-sm text-slate-600">Secure consultation room for scheduled appointments only.</p></header><section className="grid gap-4 md:grid-cols-2"><article className="rounded-lg border p-4"><h2 className="font-semibold">Appointment details</h2><ul className="mt-2 space-y-1 text-sm"><li><strong>ID:</strong> {appointment.id}</li><li><strong>Type:</strong> {appointment.consultationType}</li><li><strong>Status:</strong> {appointment.status}</li><li><strong>Start:</strong> {formatDateTime(appointment.startTime)}</li><li><strong>End:</strong> {formatDateTime(appointment.endTime)}</li></ul></article><article className="rounded-lg border p-4"><h2 className="font-semibold">Participants</h2><ul className="mt-2 space-y-1 text-sm"><li><strong>Patient:</strong> {patientLabel}</li><li><strong>Practitioner:</strong> {practitionerLabel} ({practitionerSpecialty})</li>{appointment.practitioner?.email ? <li><strong>Practitioner email:</strong> {appointment.practitioner.email}</li> : null}</ul></article></section><section className="rounded-lg border p-4"><h2 className="font-semibold">Security status</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm"><li>Authenticated user: <strong>verified</strong></li><li>Participant authorization: <strong>verified</strong></li><li>Consultation type check: <strong>VIDEO</strong></li><li>Cancellation check: <strong>passed</strong></li><li>Provider: <strong>{access.provider}</strong></li><li>Room token expires: {formatDateTime(access.tokenExpiresAt)}</li><li>Access window: {formatDateTime(accessStart)} → {formatDateTime(accessExpires)}</li></ul></section>{isTooEarly ? <section className="rounded-lg border bg-slate-50 p-4"><h2 className="font-semibold">Waiting room</h2><p className="mt-2 text-sm text-slate-700">You can join this consultation starting at {formatDateTime(accessStart)}.</p></section> : <section className="space-y-4 rounded-lg border p-4"><div className="flex flex-wrap gap-3"><a href={access.joinUrl} target="_blank" rel="noopener noreferrer" className="rounded bg-black px-4 py-2 text-white">Join consultation</a><span className="text-sm text-slate-600">If embed fails, use Join consultation to open a new tab.</span></div><iframe src={access.embedUrl} title="Video consultation room" className="h-[520px] w-full rounded border" allow="camera; microphone; fullscreen; display-capture" referrerPolicy="no-referrer" /></section>}</main>;
}
