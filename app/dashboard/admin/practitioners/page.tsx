import { requireRolesForPage } from "@/lib/auth/current-user";

export default async function AdminPractitionerValidationPage() {
  await requireRolesForPage(["ADMIN"]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Admin · Practitioner validation</h1>
      <p className="mt-2 text-sm text-slate-600">Review pending practitioner profiles and validate or reject requests.</p>
    </main>
  );
}
