import { requireRolesForPage } from "@/lib/auth/current-user";

export default async function AdminCatalogPage() {
  await requireRolesForPage(["ADMIN"]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Admin · Cities & specialties</h1>
      <p className="mt-2 text-sm text-slate-600">Manage cities and specialties taxonomy for search and SEO pages.</p>
    </main>
  );
}
