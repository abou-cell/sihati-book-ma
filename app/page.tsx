import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function HomePage() {
  const searchAction = process.env.GITHUB_PAGES === "true" ? "/sihati/search" : "/search";

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
      <div className="max-w-3xl space-y-4">
        <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
          Book an appointment with a healthcare professional in Morocco
        </h1>
        <p className="text-base text-slate-600 sm:text-lg">
          Find trusted practitioners, book in-person appointments, and prepare for
          secure video consultations.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <form action={searchAction} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto]">
          <Input
            name="q"
            placeholder="Search by specialty, practitioner, or clinic"
            aria-label="Search practitioners"
          />
          <Input name="city" placeholder="City" aria-label="City" />
          <Button type="submit" className="w-full md:w-auto">
            Find a practitioner
          </Button>
        </form>
        <div className="mt-4">
          <Button type="button" variant="secondary">
            Join as practitioner
          </Button>
        </div>
      </div>
    </section>
  );
}
