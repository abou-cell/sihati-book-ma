import { requireRolesForPage } from "@/lib/auth/current-user";

import PractitionerAvailabilityClient from "./PractitionerAvailabilityClient";

export default async function PractitionerAvailabilityPage() {
  await requireRolesForPage(["PRACTITIONER", "CLINIC_ADMIN", "ADMIN"]);

  return <PractitionerAvailabilityClient />;
}
