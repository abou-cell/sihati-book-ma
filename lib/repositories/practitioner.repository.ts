import { prisma } from "@/lib/db/prisma";

export type PractitionerPublicRecord = {
  id: string;
  isVerified: boolean;
  name: string;
  specialty: string;
  city: string;
};

export interface PractitionerRepository {
  getPublicById(id: string): Promise<PractitionerPublicRecord | null>;
}

export class PrismaPractitionerRepository implements PractitionerRepository {
  async getPublicById(id: string): Promise<PractitionerPublicRecord | null> {
    return prisma.practitioner.findUnique({
      where: { id },
      select: { id: true, isVerified: true, name: true, specialty: true, city: true },
    });
  }
}
