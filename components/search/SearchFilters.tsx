'use client';

import { Input } from '@/components/ui/Input';

export type SearchFiltersValue = {
  q: string;
  specialty: string;
  city: string;
  video: boolean;
  availableToday: boolean;
  minPrice: string;
  maxPrice: string;
  sort: 'nextAvailable' | 'priceAsc' | 'priceDesc';
};

type SearchFiltersProps = {
  value: SearchFiltersValue;
  onChange: (next: SearchFiltersValue) => void;
  onReset: () => void;
};

export function SearchFilters({ value, onChange, onReset }: SearchFiltersProps) {
  const setField = <K extends keyof SearchFiltersValue>(key: K, fieldValue: SearchFiltersValue[K]) => {
    onChange({ ...value, [key]: fieldValue });
  };

  return (
    <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 md:sticky md:top-6">
      <h2 className="text-base font-semibold text-slate-900">Search filters</h2>
      <Input placeholder="Search by name or specialty" value={value.q} onChange={(e) => setField('q', e.target.value)} />
      <Input placeholder="Specialty" value={value.specialty} onChange={(e) => setField('specialty', e.target.value)} />
      <Input placeholder="City" value={value.city} onChange={(e) => setField('city', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input type="number" min={0} placeholder="Min price" value={value.minPrice} onChange={(e) => setField('minPrice', e.target.value)} />
        <Input type="number" min={0} placeholder="Max price" value={value.maxPrice} onChange={(e) => setField('maxPrice', e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={value.video} onChange={(e) => setField('video', e.target.checked)} />
        Video consultation
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={value.availableToday} onChange={(e) => setField('availableToday', e.target.checked)} />
        Available today
      </label>
      <label className="block text-sm text-slate-700">
        Sort by
        <select
          className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
          value={value.sort}
          onChange={(e) => setField('sort', e.target.value as SearchFiltersValue['sort'])}
        >
          <option value="nextAvailable">Next available slot</option>
          <option value="priceAsc">Price (low to high)</option>
          <option value="priceDesc">Price (high to low)</option>
        </select>
      </label>
      <button type="button" className="text-sm font-medium text-slate-600 underline" onClick={onReset}>
        Reset filters
      </button>
    </aside>
  );
}
