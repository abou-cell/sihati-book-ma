"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type UserRole = "PATIENT" | "PRACTITIONER" | "ADMIN";
type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
type ConsultationType = "IN_PERSON" | "VIDEO";

type PatientProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  bloodType: string;
};

type Appointment = {
  id: string;
  patientId: string;
  practitionerName: string;
  specialty: string;
  status: AppointmentStatus;
  consultationType: ConsultationType;
  startTime: string;
  endTime: string;
  isVideoJoinAvailable: boolean;
};

const currentUser: { id: string; role: UserRole } = {
  id: "patient_demo_1",
  role: "PATIENT",
};

const patientProfiles: PatientProfile[] = [
  {
    id: "patient_demo_1",
    fullName: "Yasmine Benali",
    email: "yasmine.benali@example.com",
    phone: "+212600000000",
    bloodType: "O+",
  },
];

const appointmentsSeed: Appointment[] = [
  {
    id: "apt_1",
    patientId: "patient_demo_1",
    practitionerName: "Dr. Sara Alaoui",
    specialty: "Dermatology",
    status: "CONFIRMED",
    consultationType: "VIDEO",
    startTime: "2026-05-10T09:30:00.000Z",
    endTime: "2026-05-10T10:00:00.000Z",
    isVideoJoinAvailable: true,
  },
  {
    id: "apt_2",
    patientId: "patient_demo_1",
    practitionerName: "Dr. Samir Idrissi",
    specialty: "General Medicine",
    status: "PENDING",
    consultationType: "IN_PERSON",
    startTime: "2026-05-14T15:00:00.000Z",
    endTime: "2026-05-14T15:30:00.000Z",
    isVideoJoinAvailable: false,
  },
  {
    id: "apt_3",
    patientId: "patient_demo_1",
    practitionerName: "Dr. Ali Karim",
    specialty: "Cardiology",
    status: "COMPLETED",
    consultationType: "IN_PERSON",
    startTime: "2026-04-20T08:00:00.000Z",
    endTime: "2026-04-20T08:30:00.000Z",
    isVideoJoinAvailable: false,
  },
  {
    id: "apt_4",
    patientId: "patient_other",
    practitionerName: "Dr. Hidden Example",
    specialty: "Neurology",
    status: "CONFIRMED",
    consultationType: "VIDEO",
    startTime: "2026-05-18T09:00:00.000Z",
    endTime: "2026-05-18T09:30:00.000Z",
    isVideoJoinAvailable: true,
  },
];

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));

export default function PatientDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(appointmentsSeed);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [cancelReasonById, setCancelReasonById] = useState<Record<string, string>>({});

  const profile = patientProfiles.find((item) => item.id === currentUser.id);

  const ownAppointments = useMemo(
    () => appointments.filter((item) => item.patientId === currentUser.id),
    [appointments]
  );

  const now = new Date();
  const upcomingAppointments = ownAppointments.filter((item) => new Date(item.startTime) >= now);
  const pastAppointments = ownAppointments.filter((item) => new Date(item.startTime) < now);

  const onCancelAppointment = (appointmentId: string) => {
    setAppointments((previous) =>
      previous.map((appointment) => {
        if (appointment.id !== appointmentId) return appointment;
        if (new Date(appointment.startTime) < new Date()) return appointment;
        return { ...appointment, status: "CANCELLED" };
      })
    );
  };

  if (currentUser.role !== "PATIENT") {
    return <main className="mx-auto max-w-4xl p-6">Access denied. Patient role is required.</main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Patient dashboard</h1>
        <p className="text-sm text-slate-600">Manage your appointments and personal medical overview.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border bg-white p-4 md:col-span-2">
          <h2 className="text-lg font-semibold">Upcoming appointments</h2>
          <div className="mt-4 space-y-3">
            {upcomingAppointments.length ? (
              upcomingAppointments.map((appointment) => {
                const isVideoJoinVisible =
                  appointment.consultationType === "VIDEO" &&
                  appointment.isVideoJoinAvailable &&
                  appointment.status !== "CANCELLED";

                return (
                  <div key={appointment.id} className="rounded-xl border p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium">{appointment.practitionerName}</p>
                        <p className="text-sm text-slate-600">{appointment.specialty}</p>
                        <p className="text-sm text-slate-700">{formatDateTime(appointment.startTime)}</p>
                        <p className="text-sm">Status: {appointment.status}</p>
                        <p className="text-sm">Consultation: {appointment.consultationType}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => setSelectedAppointmentId(appointment.id)}>
                          View details
                        </Button>
                        {isVideoJoinVisible ? <Button>Join video</Button> : null}
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <Input
                        placeholder="Cancellation reason (optional)"
                        value={cancelReasonById[appointment.id] ?? ""}
                        onChange={(event) =>
                          setCancelReasonById((previous) => ({ ...previous, [appointment.id]: event.target.value }))
                        }
                      />
                      <Button
                        variant="secondary"
                        disabled={appointment.status === "CANCELLED"}
                        onClick={() => onCancelAppointment(appointment.id)}
                      >
                        Cancel appointment
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-600">No upcoming appointments.</p>
            )}
          </div>
        </article>

        <article className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Patient profile summary</h2>
          {profile ? (
            <ul className="mt-3 space-y-2 text-sm">
              <li><strong>Name:</strong> {profile.fullName}</li>
              <li><strong>Email:</strong> {profile.email}</li>
              <li><strong>Phone:</strong> {profile.phone}</li>
              <li><strong>Blood type:</strong> {profile.bloodType}</li>
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">Profile data is unavailable.</p>
          )}
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Past appointments</h2>
          <div className="mt-4 space-y-3">
            {pastAppointments.length ? (
              pastAppointments.map((appointment) => (
                <div key={appointment.id} className="rounded-xl border p-4">
                  <p className="font-medium">{appointment.practitionerName}</p>
                  <p className="text-sm text-slate-600">{appointment.specialty}</p>
                  <p className="text-sm text-slate-700">{formatDateTime(appointment.startTime)}</p>
                  <p className="text-sm">Status: {appointment.status}</p>
                  <p className="text-sm">Consultation: {appointment.consultationType}</p>
                  <Button className="mt-3" variant="secondary" onClick={() => setSelectedAppointmentId(appointment.id)}>
                    View details
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">No past appointments.</p>
            )}
          </div>
        </article>

        <article className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Medical documents</h2>
          <p className="mt-3 text-sm text-slate-600">
            Placeholder: prescriptions, lab reports, and consultation summaries will be shown here.
          </p>
          <Link className="mt-4 inline-block text-sm underline" href="#">
            Open documents center
          </Link>
        </article>
      </section>

      {selectedAppointmentId ? (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Appointment details</h2>
          {appointments
            .filter((item) => item.id === selectedAppointmentId && item.patientId === currentUser.id)
            .map((appointment) => (
              <div key={appointment.id} className="mt-3 space-y-1 text-sm">
                <p><strong>Practitioner:</strong> {appointment.practitionerName}</p>
                <p><strong>Specialty:</strong> {appointment.specialty}</p>
                <p><strong>Status:</strong> {appointment.status}</p>
                <p><strong>Date & time:</strong> {formatDateTime(appointment.startTime)}</p>
                <p><strong>Ends at:</strong> {formatDateTime(appointment.endTime)}</p>
                <p><strong>Consultation type:</strong> {appointment.consultationType}</p>
                <p><strong>Cancellation reason:</strong> {cancelReasonById[appointment.id] || "Not provided"}</p>
              </div>
            ))}
          <Button className="mt-4" variant="secondary" onClick={() => setSelectedAppointmentId(null)}>
            Close
          </Button>
        </section>
      ) : null}
    </main>
  );
}
