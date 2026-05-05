import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type UserRole = "PATIENT" | "PRACTITIONER" | "ADMIN";
type ConsultationType = "IN_PERSON" | "VIDEO";
type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

type AppointmentRecord = { id: string; patient: { id: string; fullName: string; email: string }; practitioner: { id: string; fullName: string; specialty: string; email: string }; consultationType: ConsultationType; status: AppointmentStatus; startTime: string; endTime: string; jitsiRoomName: string };

const ACCESS_OPEN_MINUTES = 15;
const ACCESS_EXPIRE_HOURS = 2;
const appointments: AppointmentRecord[] = [{ id: "apt_video_1", patient: { id: "patient_demo_1", fullName: "Yasmine Benali", email: "yasmine.benali@example.com" }, practitioner: { id: "p_1", fullName: "Dr. Sara Alaoui", specialty: "Dermatology", email: "sara.alaoui@example.com" }, consultationType: "VIDEO", status: "CONFIRMED", startTime: "2026-05-10T09:30:00.000Z", endTime: "2026-05-10T10:00:00.000Z", jitsiRoomName: "sihati-apt-video-1" }];

function formatDateTime(value: string | Date) { return new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" }).format(value instanceof Date ? value : new Date(value)); }

export default async function ConsultationPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  const requestHeaders = await headers();
  const userId = requestHeaders.get("x-user-id");
  const userRole = requestHeaders.get("x-user-role") as UserRole | null;

  if (!userId || !userRole) redirect("/access-denied");

  const appointment = appointments.find((item) => item.id === appointmentId);
  if (!appointment) redirect("/access-denied");

  const isParticipant = (userRole === "PATIENT" && userId === appointment.patient.id) || (userRole === "PRACTITIONER" && userId === appointment.practitioner.id);
  if (!isParticipant || appointment.consultationType !== "VIDEO" || appointment.status === "CANCELLED") redirect("/access-denied");

  const now = new Date();
  const startTime = new Date(appointment.startTime);
  const endTime = new Date(appointment.endTime);
  const accessStart = new Date(startTime.getTime() - ACCESS_OPEN_MINUTES * 60_000);
  const accessExpire = new Date(endTime.getTime() + ACCESS_EXPIRE_HOURS * 60 * 60_000);
  if (now > accessExpire) redirect("/access-denied");

  const isTooEarly = now < accessStart;
  const meetingUrl = `https://meet.jit.si/${appointment.jitsiRoomName}`;

  return <main className="mx-auto max-w-6xl space-y-6 p-6"><header><h1 className="text-2xl font-semibold">Video consultation</h1><p className="text-sm text-slate-600">Secure consultation room for scheduled appointments only.</p></header><section className="grid gap-4 md:grid-cols-2"><article className="rounded-lg border p-4"><h2 className="font-semibold">Appointment details</h2><ul className="mt-2 space-y-1 text-sm"><li><strong>ID:</strong> {appointment.id}</li><li><strong>Type:</strong> {appointment.consultationType}</li><li><strong>Status:</strong> {appointment.status}</li><li><strong>Start:</strong> {formatDateTime(appointment.startTime)}</li><li><strong>End:</strong> {formatDateTime(appointment.endTime)}</li></ul></article><article className="rounded-lg border p-4"><h2 className="font-semibold">Participants</h2><ul className="mt-2 space-y-1 text-sm"><li><strong>Patient:</strong> {appointment.patient.fullName} ({appointment.patient.email})</li><li><strong>Practitioner:</strong> {appointment.practitioner.fullName} ({appointment.practitioner.specialty})</li><li><strong>Practitioner email:</strong> {appointment.practitioner.email}</li></ul></article></section><section className="rounded-lg border p-4"><h2 className="font-semibold">Security status</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm"><li>Authenticated user: <strong>verified</strong></li><li>Participant authorization: <strong>verified</strong></li><li>Consultation type check: <strong>VIDEO</strong></li><li>Cancellation check: <strong>passed</strong></li><li>Access window: {formatDateTime(accessStart)} → {formatDateTime(accessExpire)}</li></ul></section>{isTooEarly ? <section className="rounded-lg border bg-slate-50 p-4"><h2 className="font-semibold">Waiting room</h2><p className="mt-2 text-sm text-slate-700">You can join this consultation starting at {formatDateTime(accessStart)}.</p></section> : <section className="space-y-4 rounded-lg border p-4"><div className="flex flex-wrap gap-3"><a href={meetingUrl} target="_blank" rel="noopener noreferrer" className="rounded bg-black px-4 py-2 text-white">Join consultation</a><span className="text-sm text-slate-600">If embed fails, use Join consultation to open a new tab.</span></div><iframe src={meetingUrl} title="Jitsi consultation room" className="h-[520px] w-full rounded border" allow="camera; microphone; fullscreen; display-capture" referrerPolicy="no-referrer" /></section>}</main>;
}
