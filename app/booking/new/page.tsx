import { requireRolesForPage } from "@/lib/auth/current-user";

import BookingNewClient from "./BookingNewClient";

export default async function NewAppointmentPage() {
  await requireRolesForPage(["PATIENT"]);

  return <BookingNewClient />;
}
