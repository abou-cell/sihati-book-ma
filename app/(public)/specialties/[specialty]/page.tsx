export function generateStaticParams() {
  return [
    { specialty: "dermatology" },
    { specialty: "cardiology" },
    { specialty: "pediatrics" },
  ];
}

export default async function SpecialtySeoPage({ params }: { params: Promise<{ specialty: string }> }) {
  const { specialty } = await params;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Top {specialty} practitioners in Morocco</h1>
      <p className="mt-2 text-sm text-slate-600">SEO landing page for specialty-focused discovery and booking.</p>
    </main>
  );
}
