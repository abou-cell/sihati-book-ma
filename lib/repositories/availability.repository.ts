import { prisma } from "@/lib/db/prisma";
import type { Appointment, ConsultationReason } from "@/lib/services/availability.service";
import type { AvailabilityDateRange, AvailabilityRule, BlockedDate } from "@/lib/validators/availability";

export interface AvailabilityRepository {
  getRulesByPractitioner(practitionerId: string): Promise<AvailabilityRule[]>;
  getBlockedDatesByPractitioner(practitionerId: string, dateRange: AvailabilityDateRange): Promise<BlockedDate[]>;
  getAppointmentsByPractitioner(practitionerId: string, dateRange: AvailabilityDateRange): Promise<Appointment[]>;
  getReasonById(reasonId: string): Promise<ConsultationReason | null>;
}

export class PrismaAvailabilityRepository implements AvailabilityRepository {
  async getRulesByPractitioner(practitionerId: string): Promise<AvailabilityRule[]> {
    return prisma.availabilityRule.findMany({ where: { practitionerId } });
  }

  async getBlockedDatesByPractitioner(practitionerId: string, dateRange: AvailabilityDateRange): Promise<BlockedDate[]> {
    return prisma.blockedDate.findMany({ where: { practitionerId, date: { gte: dateRange.from, lte: dateRange.to } } });
  }

  async getAppointmentsByPractitioner(practitionerId: string, dateRange: AvailabilityDateRange): Promise<Appointment[]> {
    const from = new Date(`${dateRange.from}T00:00:00.000Z`);
    const to = new Date(`${dateRange.to}T23:59:59.999Z`);

    const appointments = await prisma.appointment.findMany({
      where: { practitionerId, startTime: { gte: from, lte: to } },
      select: { id: true, practitionerId: true, consultationType: true, startTime: true, endTime: true, status: true },
    });

    return appointments.map((item: any) => ({ ...item, startsAt: item.startTime.toISOString(), endsAt: item.endTime.toISOString() }));
  }

  async getReasonById(reasonId: string): Promise<ConsultationReason | null> {
    return prisma.consultationReason.findUnique({ where: { id: reasonId }, select: { id: true, slotDurationMinutes: true } });
  }
}
