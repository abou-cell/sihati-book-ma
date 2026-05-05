import { prisma } from "@/lib/db/prisma";
import type { NotificationRecord, NotificationRepository } from "@/lib/services/notification.service";

export class PrismaNotificationRepository implements NotificationRepository {
  async createNotification(input: Omit<NotificationRecord, "id">): Promise<NotificationRecord> {
    const created = await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        appointmentId: input.appointmentId,
        channel: input.channel,
        type: input.type,
        recipient: input.recipient,
        subject: input.subject,
        message: input.message,
        status: input.status,
        sentAt: input.sentAt ? new Date(input.sentAt) : null,
        metadata: input.metadata,
      },
    });

    return { ...created, sentAt: created.sentAt ? created.sentAt.toISOString() : null, metadata: (created.metadata as Record<string, string> | undefined) };
  }
}
