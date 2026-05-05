import { prisma } from "@/lib/db/prisma";
import type { PractitionerSearchQuery } from "@/lib/validators/practitioner-search";

export type PractitionerPublicRecord = {
  id: string;
  isVerified: boolean;
  name: string;
  specialty: string;
  city: string;
};

export type PractitionerSearchRecord = {
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

export interface PractitionerRepository {
  getPublicById(id: string): Promise<PractitionerPublicRecord | null>;
}

export interface PractitionerSearchRepository {
  search(query: PractitionerSearchQuery): Promise<{ data: PractitionerSearchRecord[]; total: number }>;
}

export class PrismaPractitionerRepository implements PractitionerRepository {
  async getPublicById(id: string): Promise<PractitionerPublicRecord | null> {
    return prisma.practitioner.findUnique({
      where: { id },
      select: { id: true, isVerified: true, name: true, specialty: true, city: true },
    });
  }
}

export class PrismaPractitionerSearchRepository implements PractitionerSearchRepository {
  async search(query: PractitionerSearchQuery): Promise<{ data: PractitionerSearchRecord[]; total: number }> {
    const where = {
      isVerified: true,
      ...(query.city ? { city: { equals: query.city, mode: "insensitive" as const } } : {}),
      ...(query.specialty ? { specialty: { equals: query.specialty, mode: "insensitive" as const } } : {}),
      ...(query.video ? { acceptsVideoConsultation: true } : {}),
      ...(typeof query.minPrice === "number" ? { consultationFee: { gte: query.minPrice } } : {}),
      ...(typeof query.maxPrice === "number"
        ? { consultationFee: { ...(typeof query.minPrice === "number" ? { gte: query.minPrice } : {}), lte: query.maxPrice } }
        : {}),
      ...(query.availableToday
        ? {
            nextAvailableSlot: {
              gte: new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`),
              lte: new Date(`${new Date().toISOString().slice(0, 10)}T23:59:59.999Z`),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { specialty: { contains: query.q, mode: "insensitive" as const } },
              { clinic: { contains: query.q, mode: "insensitive" as const } },
              { city: { contains: query.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const orderBy =
      query.sort === "priceAsc"
        ? [{ consultationFee: "asc" as const }]
        : query.sort === "priceDesc"
          ? [{ consultationFee: "desc" as const }]
          : [{ nextAvailableSlot: "asc" as const }];

    const [rows, total] = await prisma.$transaction([
      prisma.practitioner.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.practitioner.count({ where }),
    ]);

    return {
      data: rows.map((item: (typeof rows)[number]) => ({
        id: item.id,
        slug: item.id,
        name: item.name,
        specialty: item.specialty,
        city: item.city,
        address: item.clinic ?? item.city,
        clinic: item.clinic ?? "",
        consultationFee: item.consultationFee ?? 0,
        videoConsultationFee: item.acceptsVideoConsultation ? item.consultationFee : null,
        acceptsVideoConsultation: item.acceptsVideoConsultation,
        isVerified: item.isVerified,
        nextAvailableSlot: item.nextAvailableSlot?.toISOString() ?? null,
        ratingAverage: 0,
        reviewsCount: 0,
      })),
      total,
    };
  }
}
