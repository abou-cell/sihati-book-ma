'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Practitioner } from '@/components/cards/PractitionerCard';
import { SearchFilters, SearchFiltersValue } from '@/components/search/SearchFilters';
import { SearchResults } from '@/components/search/SearchResults';
import { Button } from '@/components/ui/Button';

type ApiResponse = {
  data: Practitioner[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

const defaultFilters: SearchFiltersValue = {
  q: '',
  specialty: '',
  city: '',
  video: false,
  availableToday: false,
  minPrice: '',
  maxPrice: '',
  sort: 'nextAvailable',
};

const toFilters = (params: URLSearchParams): SearchFiltersValue => ({
  q: params.get('q') ?? '',
  specialty: params.get('specialty') ?? '',
  city: params.get('city') ?? '',
  video: params.get('video') === 'true',
  availableToday: params.get('availableToday') === 'true',
  minPrice: params.get('minPrice') ?? '',
  maxPrice: params.get('maxPrice') ?? '',
  sort: (params.get('sort') as SearchFiltersValue['sort']) ?? 'nextAvailable',
});

function SearchPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialFilters = useMemo(() => toFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [filters, setFilters] = useState<SearchFiltersValue>(initialFilters);
  const [page, setPage] = useState<number>(Number(searchParams.get('page') ?? 1));
  const [results, setResults] = useState<Practitioner[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    const entries = Object.entries(filters) as Array<[keyof SearchFiltersValue, string | boolean]>;

    for (const [key, value] of entries) {
      if (typeof value === 'boolean') {
        if (value) params.set(key, 'true');
      } else if (value.trim()) {
        params.set(key, value.trim());
      }
    }

    params.set('page', String(page));
    const nextSearchUrl = `${pathname}?${params.toString()}` as Route;
    router.replace(nextSearchUrl, { scroll: false });
  }, [filters, page, pathname, router]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams(searchParams.toString());
        if (!params.get('page')) params.set('page', String(page));

        const response = await fetch(`/api/practitioners/search?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Unable to fetch practitioners right now. Please try again.');
        }

        const json = (await response.json()) as ApiResponse;
        setResults(json.data);
        setPagination(json.pagination);
      } catch (requestError) {
        if ((requestError as Error).name !== 'AbortError') {
          setError('Unable to load search results. Please retry.');
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [searchParams, page]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Find a practitioner</h1>
      <div className="grid gap-6 md:grid-cols-[300px,1fr]">
        <SearchFilters
          value={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
          onReset={() => {
            setFilters(defaultFilters);
            setPage(1);
          }}
        />

        <section className="space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <p>{pagination.total} practitioners found</p>
            <p>
              Page {pagination.page} / {pagination.totalPages}
            </p>
          </div>

          <SearchResults data={results} loading={loading} error={error} />

          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
              Previous
            </Button>
            <Button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages || loading}>
              Next
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageContent />
    </Suspense>
  );
}
