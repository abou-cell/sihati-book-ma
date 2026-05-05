import { appConfig } from "@/lib/config/app";

export type NotificationChannel = "EMAIL" | "SMS" | "WHATSAPP";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED";
export type NotificationType =
  | "APPOINTMENT_CONFIRMATION_PATIENT"
  | "APPOINTMENT_CONFIRMATION_PRACTITIONER"
  | "APPOINTMENT_CANCELLATION"
  | "VIDEO_CONSULTATION_LINK"
  | "APPOINTMENT_REMINDER_24H"
  | "APPOINTMENT_REMINDER_2H";

export type NotificationRecord = {
  id: string;
  appointmentId: string;
  channel: NotificationChannel;
  type: NotificationType;
  recipient: string;
  subject: string;
  message: string;
  status: NotificationStatus;
  sentAt: string | null;
  metadata?: Record<string, string>;
};

export type NotificationRepository = {
  createNotification(input: Omit<NotificationRecord, "id">): Promise<NotificationRecord>;
};

type AppointmentNotificationContext = {
  appointmentId: string;
  recipientEmail: string;
  patientName?: string;
  practitionerName?: string;
  startTimeIso: string;
  consultationType: "IN_PERSON" | "VIDEO";
  cancelReason?: string;
  videoJoinUrl?: string;
};

type NotificationTemplate = {
  subject: string;
  message: string;
};

type EmailSender = {
  sendEmail(input: { to: string; subject: string; text: string }): Promise<void>;
};

class ConsoleEmailSender implements EmailSender {
  async sendEmail(input: { to: string; subject: string; text: string }) {
    console.log("[NotificationService][EMAIL]", {
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
  }
}

export class NotificationService {
  private readonly emailSender: EmailSender;

  constructor(private readonly repository: NotificationRepository, sender?: EmailSender) {
    this.emailSender = sender ?? new ConsoleEmailSender();
  }

  async sendAppointmentConfirmationPatient(context: AppointmentNotificationContext) {
    const template = this.buildTemplate("APPOINTMENT_CONFIRMATION_PATIENT", context);
    return this.deliverAndPersist("APPOINTMENT_CONFIRMATION_PATIENT", "EMAIL", context.recipientEmail, context, template);
  }

  async sendAppointmentConfirmationPractitioner(context: AppointmentNotificationContext) {
    const template = this.buildTemplate("APPOINTMENT_CONFIRMATION_PRACTITIONER", context);
    return this.deliverAndPersist("APPOINTMENT_CONFIRMATION_PRACTITIONER", "EMAIL", context.recipientEmail, context, template);
  }

  async sendAppointmentCancellation(context: AppointmentNotificationContext) {
    const template = this.buildTemplate("APPOINTMENT_CANCELLATION", context);
    return this.deliverAndPersist("APPOINTMENT_CANCELLATION", "EMAIL", context.recipientEmail, context, template);
  }

  async sendVideoConsultationLink(context: AppointmentNotificationContext) {
    const template = this.buildTemplate("VIDEO_CONSULTATION_LINK", context);
    return this.deliverAndPersist("VIDEO_CONSULTATION_LINK", "EMAIL", context.recipientEmail, context, template);
  }

  async sendAppointmentReminder24h(context: AppointmentNotificationContext) {
    const template = this.buildTemplate("APPOINTMENT_REMINDER_24H", context);
    return this.deliverAndPersist("APPOINTMENT_REMINDER_24H", "EMAIL", context.recipientEmail, context, template);
  }

  async sendAppointmentReminder2h(context: AppointmentNotificationContext) {
    const template = this.buildTemplate("APPOINTMENT_REMINDER_2H", context);
    return this.deliverAndPersist("APPOINTMENT_REMINDER_2H", "EMAIL", context.recipientEmail, context, template);
  }

  private async deliverAndPersist(
    type: NotificationType,
    channel: NotificationChannel,
    recipient: string,
    context: AppointmentNotificationContext,
    template: NotificationTemplate
  ) {
    let status: NotificationStatus = "PENDING";
    let sentAt: string | null = null;

    try {
      if (channel === "EMAIL") {
        await this.emailSender.sendEmail({ to: recipient, subject: template.subject, text: template.message });
      }

      // Future channels intentionally not active in MVP.
      if (channel === "SMS" || channel === "WHATSAPP") {
        console.log(`[NotificationService][${channel}] Placeholder sender not implemented yet.`);
      }

      status = "SENT";
      sentAt = new Date().toISOString();
    } catch {
      status = "FAILED";
    }

    return this.repository.createNotification({
      appointmentId: context.appointmentId,
      channel,
      type,
      recipient,
      subject: template.subject,
      message: template.message,
      status,
      sentAt,
      metadata: {
        consultationType: context.consultationType,
        startTimeIso: context.startTimeIso,
      },
    });
  }

  private buildTemplate(type: NotificationType, context: AppointmentNotificationContext): NotificationTemplate {
    const when = new Date(context.startTimeIso).toUTCString();
    const practitionerLabel = context.practitionerName ? ` with ${context.practitionerName}` : "";

    switch (type) {
      case "APPOINTMENT_CONFIRMATION_PATIENT":
        return {
          subject: "Your appointment is confirmed",
          message: `Hello${context.patientName ? ` ${context.patientName}` : ""}, your appointment${practitionerLabel} is confirmed for ${when}.`,
        };
      case "APPOINTMENT_CONFIRMATION_PRACTITIONER":
        return {
          subject: "New appointment confirmed",
          message: `A new ${context.consultationType.toLowerCase()} appointment is confirmed for ${when}.`,
        };
      case "APPOINTMENT_CANCELLATION":
        return {
          subject: "Appointment cancelled",
          message: `Your appointment scheduled for ${when} has been cancelled.${
            context.cancelReason ? " Reason was provided." : ""
          }`,
        };
      case "VIDEO_CONSULTATION_LINK":
        return {
          subject: "Video consultation link",
          message: `Your video consultation is scheduled for ${when}. Join link: ${context.videoJoinUrl ?? appConfig.app.url}`,
        };
      case "APPOINTMENT_REMINDER_24H":
        return {
          subject: "Appointment reminder (24h)",
          message: `Reminder: you have an appointment scheduled for ${when}.`,
        };
      case "APPOINTMENT_REMINDER_2H":
        return {
          subject: "Appointment reminder (2h)",
          message: `Reminder: your appointment starts in about 2 hours (${when}).`,
        };
    }
  }
}
