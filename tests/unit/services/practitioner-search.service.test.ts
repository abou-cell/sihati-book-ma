import { describe, expect, it, vi } from "vitest";

import { PractitionerSearchService } from "@/lib/services/practitioner-search.service";
import type { PractitionerSearchRepository } from "@/lib/repositories/practitioner.repository";

describe("PractitionerSearchService", () => {
  it("removes internal clinic data and calculates pagination", async () => {
    const repository: PractitionerSearchRepository = {
      search: vi.fn(async () => ({
        total: 11,
        data: [
          {
            id: "prac_1",
            slug: "dr-sara",
            name: "Dr. Sara",
            specialty: "Dermatology",
            city: "Casablanca",
            address: "Maarif",
            clinic: "Internal clinic name",
            consultationFee: 300,
            videoConsultationFee: 250,
            acceptsVideoConsultation: true,
            isVerified: true,
            nextAvailableSlot: "2026-05-06T10:00:00.000Z",
            ratingAverage: 4.8,
            reviewsCount: 10,
          },
        ],
      })),
    };
    const service = new PractitionerSearchService(repository);

    const result = await service.search({ page: 2, limit: 5, sort: "nextAvailable" });

    expect(result.pagination).toEqual({ total: 11, page: 2, limit: 5, totalPages: 3 });
    expect(result.data[0]).not.toHaveProperty("clinic");
    expect(result.data[0]).toMatchObject({ id: "prac_1", name: "Dr. Sara" });
  });

  it("keeps totalPages at least one for empty results", async () => {
    const repository: PractitionerSearchRepository = {
      search: vi.fn(async () => ({ total: 0, data: [] })),
    };

    await expect(new PractitionerSearchService(repository).search({ page: 1, limit: 10, sort: "nextAvailable" })).resolves.toMatchObject({
      pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
    });
  });
});
