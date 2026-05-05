import { prisma } from "@/lib/db/prisma";

export type SafeUser = { id: string; role: "PATIENT" | "PRACTITIONER" | "ADMIN"; email: string; fullName: string };

export interface UserRepository {
  getSafeById(id: string): Promise<SafeUser | null>;
}

export class PrismaUserRepository implements UserRepository {
  async getSafeById(id: string): Promise<SafeUser | null> {
    return prisma.user.findUnique({ where: { id }, select: { id: true, role: true, email: true, fullName: true } });
  }
}
