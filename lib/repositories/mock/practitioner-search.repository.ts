import type { PractitionerSearchRepository, PractitionerSearchRecord } from "@/lib/repositories/practitioner.repository";
import type { PractitionerSearchQuery } from "@/lib/validators/practitioner-search";

const practitionerSeedData: PractitionerSearchRecord[] = [
  { id: "p_1", slug: "dr-sara-alaoui", name: "Dr. Sara Alaoui", specialty: "Dermatology", city: "Casablanca", address: "Maarif Center, Casablanca", clinic: "Alaoui Skin Clinic", consultationFee: 300, videoConsultationFee: 250, acceptsVideoConsultation: true, isVerified: true, nextAvailableSlot: "2026-05-06T09:00:00.000Z", ratingAverage: 4.8, reviewsCount: 128 },
  { id: "p_2", slug: "dr-youssef-el-idrissi", name: "Dr. Youssef El Idrissi", specialty: "Cardiology", city: "Rabat", address: "Agdal Medical Hub, Rabat", clinic: "Rabat Heart Center", consultationFee: 450, videoConsultationFee: null, acceptsVideoConsultation: false, isVerified: true, nextAvailableSlot: "2026-05-05T15:00:00.000Z", ratingAverage: 4.6, reviewsCount: 93 },
  { id: "p_3", slug: "dr-amina-benali", name: "Dr. Amina Benali", specialty: "Pediatrics", city: "Casablanca", address: "Palmier Avenue, Casablanca", clinic: "Kids First Clinic", consultationFee: 280, videoConsultationFee: 220, acceptsVideoConsultation: true, isVerified: false, nextAvailableSlot: "2026-05-07T11:30:00.000Z", ratingAverage: 4.7, reviewsCount: 76 },
];

const normalize = (value: string) => value.trim().toLowerCase();

export class MockPractitionerSearchRepository implements PractitionerSearchRepository {
  async search(query: PractitionerSearchQuery): Promise<{ data: PractitionerSearchRecord[]; total: number }> {
    const todayIsoDate = new Date().toISOString().slice(0, 10);
    const filtered = practitionerSeedData
      .filter((p) => p.isVerified)
      .filter((p) => (!query.city ? true : normalize(p.city) === normalize(query.city)))
      .filter((p) => (!query.specialty ? true : normalize(p.specialty) === normalize(query.specialty)))
      .filter((p) => (!query.video ? true : p.acceptsVideoConsultation))
      .filter((p) => (typeof query.minPrice !== "number" ? true : p.consultationFee >= query.minPrice))
      .filter((p) => (typeof query.maxPrice !== "number" ? true : p.consultationFee <= query.maxPrice))
      .filter((p) => (!query.availableToday ? true : p.nextAvailableSlot?.startsWith(todayIsoDate) ?? false))
      .filter((p) => {
        if (!query.q) return true;
        const q = normalize(query.q);
        return [p.name, p.specialty, p.clinic, p.city].join(" ").toLowerCase().includes(q);
      });

    const sorted = [...filtered].sort((a, b) => {
      if (query.sort === "priceAsc") return a.consultationFee - b.consultationFee;
      if (query.sort === "priceDesc") return b.consultationFee - a.consultationFee;
      const aTime = a.nextAvailableSlot ? new Date(a.nextAvailableSlot).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.nextAvailableSlot ? new Date(b.nextAvailableSlot).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

    const start = (query.page - 1) * query.limit;
    return { data: sorted.slice(start, start + query.limit), total: sorted.length };
  }
}
