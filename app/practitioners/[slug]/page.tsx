import Link from "next/link";

export default async function PractitionerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Practitioner profile</h1>
      <p className="mt-2 text-sm text-slate-600">Profile slug: {slug}</p>
      <section className="mt-8 rounded-xl border p-6">
        <h2 className="text-lg font-medium">Book a consultation</h2>
        <p className="mt-1 text-sm text-slate-600">Choose consultation type and continue to booking.</p>
        <div className="mt-4 flex gap-3">
          <Link className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" href={`/booking/new?practitionerSlug=${encodeURIComponent(slug)}&type=IN_PERSON`}>In-person</Link>
          <Link className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" href={`/booking/new?practitionerSlug=${encodeURIComponent(slug)}&type=VIDEO`}>Video</Link>
        </div>
      </section>
    </main>
  );
}
