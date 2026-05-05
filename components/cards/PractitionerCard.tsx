import Link from 'next/link';

export type Practitioner = {
  id: string;
  slug: string;
  name: string;
  specialty: string;
  city: string;
  address: string;
  consultationFee: number;
  videoConsultationFee: number | null;
  acceptsVideoConsultation: boolean;
  isVerified: boolean;
  nextAvailableSlot: string | null;
};

type PractitionerCardProps = {
  practitioner: Practitioner;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(
    value,
  );

const formatNextSlot = (slot: string | null) => {
  if (!slot) return 'No upcoming slot';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(slot));
};

export function PractitionerCard({ practitioner }: PractitionerCardProps) {
  const initials = practitioner.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-700">
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900">{practitioner.name}</h3>
              {practitioner.isVerified && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Verified
                </span>
              )}
              {practitioner.acceptsVideoConsultation && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Video consultation
                </span>
              )}
            </div>
            <p className="text-sm text-slate-700">{practitioner.specialty}</p>
            <p className="mt-1 text-sm text-slate-600">{practitioner.city}</p>
            <p className="text-sm text-slate-500">{practitioner.address}</p>
          </div>
        </div>

        <div className="min-w-[220px] space-y-2 text-sm">
          <p className="text-slate-700">In-person fee: <span className="font-semibold">{formatCurrency(practitioner.consultationFee)}</span></p>
          {practitioner.videoConsultationFee !== null ? (
            <p className="text-slate-700">Video fee: <span className="font-semibold">{formatCurrency(practitioner.videoConsultationFee)}</span></p>
          ) : (
            <p className="text-slate-500">Video fee: Not available</p>
          )}
          <p className="text-slate-700">Next slot: <span className="font-medium">{formatNextSlot(practitioner.nextAvailableSlot)}</span></p>
          <Link
            href={`/practitioners/${practitioner.slug}`}
            className="inline-flex rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            Book appointment
          </Link>
        </div>
      </div>
    </article>
  );
}
