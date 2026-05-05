import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppointmentError, AppointmentService } from "@/lib/services/appointment.service";
import { createAppointmentSchema } from "@/lib/validators/appointment";

const practitioners = [
  { id: "p_1", isVerified: true, name: "Dr. Sara Alaoui", specialty: "Dermatology", city: "Casablanca" },
  { id: "p_2", isVerified: false, name: "Dr. Ali Karim", specialty: "Cardiology", city: "Rabat" },
];

const reasons = [
  {
    id: "reason_general",
    practitionerId: "p_1",
    label: "General consultation",
    inPersonPrice: 300,
    videoPrice: 250,
    isVideoEnabled: true,
    slotDurationMinutes: 30,
  },
  {
    id: "reason_procedure",
    practitionerId: "p_1",
    label: "In-clinic procedure",
    inPersonPrice: 600,
    videoPrice: null,
    isVideoEnabled: false,
    slotDurationMinutes: 45,
  },
];

const appointments: Array<any> = [];
const notifications: Array<any> = [];

const service = new AppointmentService({
  async getPractitionerById(id) {
    return practitioners.find((item) => item.id === id) ?? null;
  },
  async getReasonById(id) {
    return reasons.find((item) => item.id === id) ?? null;
  },
  async findActiveAppointmentBySlot(practitionerId, startTime) {
    return appointments.find(
      (item) => item.practitionerId === practitionerId && item.startTime === startTime && item.status !== "CANCELLED"
    ) ?? null;
  },
  async createAppointment(input) {
    const id = `apt_${appointments.length + 1}`;
    const appointment = { id, ...input };
    const raceCheck = appointments.find(
      (item) => item.practitionerId === input.practitionerId && item.startTime === input.startTime && item.status !== "CANCELLED"
    );

    if (raceCheck) {
      throw new AppointmentError("SLOT_NOT_AVAILABLE", "Selected slot is already booked");
    }

    appointments.push(appointment);
    return appointment;
  },
  async createNotification(input) {
    const notification = { id: `notif_${notifications.length + 1}`, ...input };
    notifications.push(notification);
    return notification;
  },
});

export async function POST(request: Request) {
  try {
    const role = request.headers.get("x-user-role");
    const patientId = request.headers.get("x-user-id");

    if (!role || !patientId) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    if (role !== "PATIENT") {
      return NextResponse.json({ message: "Only patients can create appointments" }, { status: 403 });
    }

    const body = await request.json();
    const payload = createAppointmentSchema.parse(body);

    const result = await service.createAppointment(payload, patientId);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: "Invalid request payload", errors: error.flatten() }, { status: 400 });
    }

    if (error instanceof AppointmentError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: 409 });
    }

    return NextResponse.json({ message: "Unexpected server error" }, { status: 500 });
  }
}
