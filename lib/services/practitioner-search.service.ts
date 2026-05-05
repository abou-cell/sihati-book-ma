import type {
  PractitionerSearchRecord,
  PractitionerSearchRepository,
} from "@/lib/repositories/practitioner.repository";
import type { PractitionerSearchQuery } from "@/lib/validators/practitioner-search";

export type PractitionerSearchResult = Omit<PractitionerSearchRecord, "clinic">;

export type PractitionerSearchResponse = {
  data: PractitionerSearchResult[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export class PractitionerSearchService {
  constructor(private readonly repository: PractitionerSearchRepository) {}

  async search(query: PractitionerSearchQuery): Promise<PractitionerSearchResponse> {
    const { data, total } = await this.repository.search(query);
    const totalPages = Math.max(1, Math.ceil(total / query.limit));

    return {
      data: data.map(({ clinic: _clinic, ...safePractitioner }) => safePractitioner),
      pagination: { total, page: query.page, limit: query.limit, totalPages },
    };
  }
}
