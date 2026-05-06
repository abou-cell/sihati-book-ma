import { requireRolesForPage } from "@/lib/auth/current-user";

export default async function PractitionerAppointmentsPage() {
  await requireRolesForPage(["PRACTITIONER", "ADMIN", "CLINIC_ADMIN"]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Practitioner appointments</h1>
      <p className="mt-4 text-sm text-slate-600">
        Appointment management will appear here once practitioner scheduling is connected to persisted production data.
      </p>
    </main>
  );
}
