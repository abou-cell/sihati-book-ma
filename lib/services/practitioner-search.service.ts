import type { PractitionerSearchQuery } from '@/lib/validators/practitioner-search';

type PractitionerRecord = {
  id: string;
  slug: string;
  name: string;
  specialty: string;
  city: string;
  address: string;
  clinic: string;
  consultationFee: number;
  videoConsultationFee: number | null;
  acceptsVideoConsultation: boolean;
  isVerified: boolean;
  nextAvailableSlot: string | null;
  ratingAverage: number;
  reviewsCount: number;
};

export type PractitionerSearchResult = Omit<PractitionerRecord, 'clinic'>;

export type PractitionerSearchResponse = {
  data: PractitionerSearchResult[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

const practitionerSeedData: PractitionerRecord[] = [
  {
    id: 'p_1',
    slug: 'dr-sara-alaoui',
    name: 'Dr. Sara Alaoui',
    specialty: 'Dermatology',
    city: 'Casablanca',
    address: 'Maarif Center, Casablanca',
    clinic: 'Alaoui Skin Clinic',
    consultationFee: 300,
    videoConsultationFee: 250,
    acceptsVideoConsultation: true,
    isVerified: true,
    nextAvailableSlot: '2026-05-06T09:00:00.000Z',
    ratingAverage: 4.8,
    reviewsCount: 128,
  },
  {
    id: 'p_2',
    slug: 'dr-youssef-el-idrissi',
    name: 'Dr. Youssef El Idrissi',
    specialty: 'Cardiology',
    city: 'Rabat',
    address: 'Agdal Medical Hub, Rabat',
    clinic: 'Rabat Heart Center',
    consultationFee: 450,
    videoConsultationFee: null,
    acceptsVideoConsultation: false,
    isVerified: true,
    nextAvailableSlot: '2026-05-05T15:00:00.000Z',
    ratingAverage: 4.6,
    reviewsCount: 93,
  },
  {
    id: 'p_3',
    slug: 'dr-amina-benali',
    name: 'Dr. Amina Benali',
    specialty: 'Pediatrics',
    city: 'Casablanca',
    address: 'Palmier Avenue, Casablanca',
    clinic: 'Kids First Clinic',
    consultationFee: 280,
    videoConsultationFee: 220,
    acceptsVideoConsultation: true,
    isVerified: false,
    nextAvailableSlot: '2026-05-07T11:30:00.000Z',
    ratingAverage: 4.7,
    reviewsCount: 76,
  },
];

const normalize = (value: string) => value.trim().toLowerCase();

export async function searchPractitioners(
  query: PractitionerSearchQuery,
): Promise<PractitionerSearchResponse> {
  const todayIsoDate = new Date().toISOString().slice(0, 10);

  const filtered = practitionerSeedData
    .filter((practitioner) => practitioner.isVerified)
    .filter((practitioner) => {
      if (!query.city) return true;
      return normalize(practitioner.city) === normalize(query.city);
    })
    .filter((practitioner) => {
      if (!query.specialty) return true;
      return normalize(practitioner.specialty) === normalize(query.specialty);
    })
    .filter((practitioner) => {
      if (!query.video) return true;
      return practitioner.acceptsVideoConsultation;
    })
    .filter((practitioner) => {
      if (typeof query.minPrice !== 'number') return true;
      return practitioner.consultationFee >= query.minPrice;
    })
    .filter((practitioner) => {
      if (typeof query.maxPrice !== 'number') return true;
      return practitioner.consultationFee <= query.maxPrice;
    })
    .filter((practitioner) => {
      if (!query.availableToday) return true;
      return practitioner.nextAvailableSlot?.startsWith(todayIsoDate) ?? false;
    })
    .filter((practitioner) => {
      if (!query.q) return true;
      const q = normalize(query.q);
      const haystack = [
        practitioner.name,
        practitioner.specialty,
        practitioner.clinic,
        practitioner.city,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

  const sorted = [...filtered].sort((a, b) => {
    if (query.sort === 'priceAsc') {
      return a.consultationFee - b.consultationFee;
    }
    if (query.sort === 'priceDesc') {
      return b.consultationFee - a.consultationFee;
    }

    const aTime = a.nextAvailableSlot ? new Date(a.nextAvailableSlot).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.nextAvailableSlot ? new Date(b.nextAvailableSlot).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  const start = (query.page - 1) * query.limit;
  const paginated = sorted.slice(start, start + query.limit);

  return {
    data: paginated.map(({ clinic: _clinic, ...safePractitioner }) => safePractitioner),
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
    },
  };
}
