import { prisma } from "@/lib/db/prisma";
import { AppointmentError, type AppointmentStatus } from "@/lib/services/appointment.service";

type Practitioner = { id: string; isVerified: boolean; name: string; specialty: string; city: string };
type ConsultationReason = { id: string; practitionerId: string; label: string; inPersonPrice: number; videoPrice: number | null; isVideoEnabled: boolean; slotDurationMinutes: number };
type Appointment = { id: string; patientId: string; practitionerId: string; reasonId: string; consultationType: "IN_PERSON" | "VIDEO"; startTime: string; endTime: string; status: AppointmentStatus };
type Notification = { id: string; appointmentId: string; channel: "PUSH" | "EMAIL"; status: "PENDING" };

export interface AppointmentRepository {
  getPractitionerById(id: string): Promise<Practitioner | null>;
  getReasonById(id: string): Promise<ConsultationReason | null>;
  findActiveAppointmentBySlot(practitionerId: string, startTime: string): Promise<Appointment | null>;
  createAppointment(input: Omit<Appointment, "id">): Promise<Appointment>;
  createNotification(input: Omit<Notification, "id">): Promise<Notification>;
}

export class PrismaAppointmentRepository implements AppointmentRepository {
  async getPractitionerById(id: string): Promise<Practitioner | null> {
    return prisma.practitioner.findUnique({ where: { id }, select: { id: true, isVerified: true, name: true, specialty: true, city: true } });
  }
  async getReasonById(id: string): Promise<ConsultationReason | null> {
    return prisma.consultationReason.findUnique({ where: { id } });
  }
  async findActiveAppointmentBySlot(practitionerId: string, startTime: string): Promise<Appointment | null> {
    const found = await prisma.appointment.findFirst({ where: { practitionerId, startTime: new Date(startTime), status: { not: "CANCELLED" } } });
    return found ? { ...found, startTime: found.startTime.toISOString(), endTime: found.endTime.toISOString() } : null;
  }
  async createAppointment(input: Omit<Appointment, "id">): Promise<Appointment> {
    try {
      const created = await prisma.$transaction(async (tx: any) => {
        const conflict = await tx.appointment.findFirst({ where: { practitionerId: input.practitionerId, startTime: new Date(input.startTime), status: { not: "CANCELLED" } } });
        if (conflict) throw new AppointmentError("SLOT_NOT_AVAILABLE", "Selected slot is already booked");
        return tx.appointment.create({ data: { id: crypto.randomUUID(), ...input, startTime: new Date(input.startTime), endTime: new Date(input.endTime) } });
      });
      return { ...created, startTime: created.startTime.toISOString(), endTime: created.endTime.toISOString() };
    } catch (error) {
      if (error instanceof AppointmentError) throw error;
      throw new AppointmentError("APPOINTMENT_CREATE_FAILED", "Failed to create appointment");
    }
  }
  async createNotification(input: Omit<Notification, "id">): Promise<Notification> {
    const created = await prisma.notification.create({ data: { id: crypto.randomUUID(), appointmentId: input.appointmentId, channel: input.channel, status: input.status } });
    return created as Notification;
  }
}
