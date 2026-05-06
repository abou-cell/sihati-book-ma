import { requireRolesForPage } from "@/lib/auth/current-user";

import PatientDashboardClient from "../PatientDashboardClient";

export default async function PatientAppointmentsPage() {
  await requireRolesForPage(["PATIENT"]);

  return <PatientDashboardClient />;
}
