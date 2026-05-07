import { requireRolesForPage } from "@/lib/auth/current-user";
import { buildDemoSessionHeaders } from "@/lib/auth/session";
import { ServiceConfigAdminClient } from "./ServiceConfigAdminClient";

export default async function AdminServiceConfigPage() {
  const currentUser = await requireRolesForPage(["ADMIN"]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Admin · External service configuration</h1>
      <p className="mt-2 text-sm text-slate-600">
        Manage provider metadata and encrypted credentials without exposing secrets to the browser.
      </p>
      <ServiceConfigAdminClient authHeaders={buildDemoSessionHeaders(currentUser)} />
    </main>
  );
}
