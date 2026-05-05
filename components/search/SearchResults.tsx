import { Practitioner, PractitionerCard } from '@/components/cards/PractitionerCard';

type SearchResultsProps = {
  data: Practitioner[];
  loading: boolean;
  error: string | null;
};

export function SearchResults({ data, loading, error }: SearchResultsProps) {
  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">Loading practitioners...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">{error}</div>;
  }

  if (data.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">No practitioners found. Try adjusting your filters.</div>;
  }

  return (
    <div className="space-y-4">
      {data.map((practitioner) => (
        <PractitionerCard key={practitioner.id} practitioner={practitioner} />
      ))}
    </div>
  );
}
