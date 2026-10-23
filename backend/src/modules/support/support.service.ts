import { prisma } from '../../config/db';
import { TicketStatus } from '@prisma/client';

export class SupportService {
  /**
   * Create a new support ticket / feedback submission.
   */
  static async createTicket(userId: string, data: { subject?: string; message: string }) {
    const { subject, message } = data;
    if (!message || message.trim().length === 0) {
      throw { status: 400, message: 'Message content is required' };
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject: subject && subject.trim().length > 0 ? subject.trim() : 'Customer Support Request',
        message: message.trim(),
        status: TicketStatus.pending,
      },
    });

    return ticket;
  }

  /**
   * Get user's submitted support tickets.
   */
  static async getUserTickets(userId: string, page: number = 1, pageSize: number = 20) {
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(50, pageSize));
    const skip = (validPage - 1) * validPageSize;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: validPageSize,
      }),
      prisma.supportTicket.count({ where: { userId } }),
    ]);

    return {
      tickets,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total,
        totalPages: Math.ceil(total / validPageSize),
      },
    };
  }
}
