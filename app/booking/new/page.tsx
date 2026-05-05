"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { demoSessionHeaderNames } from "@/lib/auth/session";
import { createAppointmentSchema } from "@/lib/validators/appointment";

const practitioners = [
  { id: "p_1", name: "Dr. Sara Alaoui", specialty: "Dermatology", city: "Casablanca", isVerified: true },
  { id: "p_2", name: "Dr. Ali Karim", specialty: "Cardiology", city: "Rabat", isVerified: false },
];

const reasons = [
  { id: "reason_general", practitionerId: "p_1", label: "General consultation", inPersonPrice: 300, videoPrice: 250 },
  { id: "reason_procedure", practitionerId: "p_1", label: "In-clinic procedure", inPersonPrice: 600, videoPrice: null },
];

export default function NewAppointmentPage() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const parsed = useMemo(
    () =>
      createAppointmentSchema.safeParse({
        practitionerId: searchParams.get("practitionerId"),
        reasonId: searchParams.get("reasonId"),
        consultationType: searchParams.get("consultationType"),
        startTime: searchParams.get("startTime"),
      }),
    [searchParams]
  );

  if (!parsed.success) {
    return <main className="mx-auto max-w-2xl p-6">Invalid or missing booking parameters.</main>;
  }

  const { practitionerId, reasonId, consultationType, startTime } = parsed.data;
  const practitioner = practitioners.find((item) => item.id === practitionerId);
  const reason = reasons.find((item) => item.id === reasonId && item.practitionerId === practitionerId);

  if (!practitioner || !reason) {
    return <main className="mx-auto max-w-2xl p-6">Booking data not found.</main>;
  }

  const price = consultationType === "VIDEO" ? reason.videoPrice : reason.inPersonPrice;

  const onConfirm = async () => {
    setLoading(true);
    setResult("");

    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [demoSessionHeaderNames.role]: "PATIENT",
        [demoSessionHeaderNames.userId]: "patient_demo_1",
      },
      body: JSON.stringify({ practitionerId, reasonId, consultationType, startTime }),
    });

    const payload = await response.json();
    setResult(response.ok ? `Created appointment: ${payload.data.appointmentId}` : payload.message ?? "Creation failed");
    setLoading(false);
  };

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Confirm your appointment</h1>
      <section className="rounded-lg border p-4"><h2 className="font-medium">Practitioner summary</h2><p>{practitioner.name}</p><p>{practitioner.specialty}</p><p>{practitioner.city}</p></section>
      <section className="rounded-lg border p-4"><h2 className="font-medium">Consultation reason</h2><p>{reason.label}</p></section>
      <section className="rounded-lg border p-4"><h2 className="font-medium">Date & time</h2><p>{new Date(startTime).toUTCString()}</p></section>
      <section className="rounded-lg border p-4"><h2 className="font-medium">Price</h2><p>{price ? `${price} MAD` : "Not available"}</p></section>
      <section className="rounded-lg border p-4 space-y-3">
        <p>Please confirm your appointment as patient.</p>
        <button onClick={onConfirm} disabled={loading} className="rounded bg-black px-4 py-2 text-white">{loading ? "Creating..." : "Confirm appointment"}</button>
        {result ? <p>{result}</p> : null}
        <Link href="/search" className="underline">Back to search</Link>
      </section>
    </main>
  );
}
