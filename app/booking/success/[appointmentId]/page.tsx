import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { headers } from "next/headers";

type ConsultationType = "IN_PERSON" | "VIDEO";
type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

type AppointmentRecord = {
  id: string;
  patientId: string;
  practitionerId: string;
  practitionerName: string;
  specialty: string;
  clinicAddress: string | null;
  consultationType: ConsultationType;
  startTime: string;
  status: AppointmentStatus;
  videoStatus: "Not required" | "Pending" | "Ready";
};

const appointments: AppointmentRecord[] = [
  {
    id: "apt_1",
    patientId: "patient_demo_1",
    practitionerId: "p_1",
    practitionerName: "Dr. Sara Alaoui",
    specialty: "Dermatology",
    clinicAddress: "Maarif Center, Casablanca",
    consultationType: "IN_PERSON",
    startTime: "2026-05-11T09:30:00.000Z",
    status: "CONFIRMED",
    videoStatus: "Not required",
  },
  {
    id: "apt_2",
    patientId: "patient_demo_2",
    practitionerId: "p_1",
    practitionerName: "Dr. Sara Alaoui",
    specialty: "Dermatology",
    clinicAddress: null,
    consultationType: "VIDEO",
    startTime: "2026-05-12T11:00:00.000Z",
    status: "PENDING",
    videoStatus: "Pending",
  },
];

function formatAppointmentDate(dateIso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(dateIso));
}

export default async function BookingSuccessPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  const appointment = appointments.find((item) => item.id === appointmentId);

  if (!appointment) {
    notFound();
  }

  const requestHeaders = await headers();
  const userRole = requestHeaders.get("x-user-role");
  const userId = requestHeaders.get("x-user-id");

  if (!userRole || !userId) {
    forbidden();
  }

  const isAllowedPatient = userRole === "PATIENT" && userId === appointment.patientId;
  const isAllowedPractitioner = userRole === "PRACTITIONER" && userId === appointment.practitionerId;

  if (!isAllowedPatient && !isAllowedPractitioner) {
    forbidden();
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Appointment confirmed</h1>

      <section className="space-y-2 rounded-lg border p-4">
        <h2 className="font-medium">Confirmation</h2>
        <p>Your appointment has been recorded successfully.</p>
        <p>Status: {appointment.status}</p>
      </section>

      <section className="space-y-2 rounded-lg border p-4">
        <h2 className="font-medium">Practitioner</h2>
        <p>{appointment.practitionerName}</p>
        <p>{appointment.specialty}</p>
      </section>

      <section className="space-y-2 rounded-lg border p-4">
        <h2 className="font-medium">Consultation details</h2>
        {appointment.consultationType === "IN_PERSON" ? (
          <p>Clinic address: {appointment.clinicAddress ?? "Address unavailable"}</p>
        ) : (
          <p>Video consultation status: {appointment.videoStatus}</p>
        )}
        <p>Date &amp; time: {formatAppointmentDate(appointment.startTime)}</p>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href="/dashboard/patient/appointments" className="rounded bg-black px-4 py-2 text-white">
          View my appointments
        </Link>
        <button type="button" className="rounded border px-4 py-2" disabled>
          Add to calendar (coming soon)
        </button>
      </section>
    </main>
  );
}
