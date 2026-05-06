import { requireRolesForPage } from "@/lib/auth/current-user";
import Link from "next/link";

export default async function PractitionerDashboardPage() {
  await requireRolesForPage(["PRACTITIONER", "ADMIN"]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Practitioner dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Link href="/dashboard/practitioner/availability" className="rounded-xl border p-5 hover:bg-slate-50">Manage availability</Link>
        <Link href="/dashboard/practitioner/appointments" className="rounded-xl border p-5 hover:bg-slate-50">Appointments</Link>
      </div>
    </main>
  );
}
