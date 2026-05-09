export function generateStaticParams() {
  return [
    { slug: "p_1" },
    { slug: "dr-sara-alaoui" },
  ];
}

import type { Route } from "next";
import Link from "next/link";

export default async function PractitionerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const defaultStartTime = "2026-06-01T09:00:00.000Z";
  const inPersonBookingHref = (`/booking/new?practitionerId=${encodeURIComponent(slug)}&reasonId=reason_general&consultationType=IN_PERSON&startTime=${encodeURIComponent(defaultStartTime)}`) as Route;
  const videoBookingHref = (`/booking/new?practitionerId=${encodeURIComponent(slug)}&reasonId=reason_general&consultationType=VIDEO&startTime=${encodeURIComponent(defaultStartTime)}`) as Route;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Practitioner profile</h1>
      <p className="mt-2 text-sm text-slate-600">Profile slug: {slug}</p>
      <section className="mt-8 rounded-xl border p-6">
        <h2 className="text-lg font-medium">Book a consultation</h2>
        <p className="mt-1 text-sm text-slate-600">Choose consultation type and continue to booking.</p>
        <div className="mt-4 flex gap-3">
          <Link className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" href={inPersonBookingHref}>In-person</Link>
          <Link className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" href={videoBookingHref}>Video</Link>
        </div>
      </section>
    </main>
  );
}
