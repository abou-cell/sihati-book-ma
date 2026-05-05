import { requireRolesForPage } from "@/lib/auth/current-user";

import PatientDashboardClient from "./PatientDashboardClient";

export default async function PatientDashboardPage() {
  await requireRolesForPage(["PATIENT"]);

  return <PatientDashboardClient />;
}
