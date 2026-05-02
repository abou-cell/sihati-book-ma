import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Book an appointment with a healthcare professional in Morocco
        </h1>
        <p className="mt-4 text-base text-slate-600 sm:text-lg">
          Find trusted practitioners, book in-person appointments, and prepare for secure video consultations.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid gap-4 md:grid-cols-[2fr,1fr,auto,auto] md:items-center">
          <Input placeholder="Search by specialty, practitioner, or clinic" aria-label="Search" />
          <Input placeholder="City" aria-label="City" />
          <Button className="w-full md:w-auto">Find a practitioner</Button>
          <Button variant="secondary" className="w-full md:w-auto">Join as practitioner</Button>
        </div>
      </div>
    </section>
  );
}
