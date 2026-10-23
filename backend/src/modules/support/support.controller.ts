import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { SupportService } from './support.service';
import { sendSuccess, sendError } from '../../utils/response';

export class SupportController {
  /**
   * POST /api/support/tickets
   * Submit a new customer support ticket / feedback
   */
  static async createTicket(req: AuthRequest, res: Response) {
    try {
      const { subject, message } = req.body;
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return sendError(res, 'Message is required', 400);
      }

      const ticket = await SupportService.createTicket(req.user!.id, { subject, message });
      return sendSuccess(res, ticket, 'Support ticket submitted successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message ?? 'Failed to submit support ticket', err.status ?? 500);
    }
  }

  /**
   * GET /api/support/tickets
   * List support tickets submitted by current user
   */
  static async getMyTickets(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await SupportService.getUserTickets(req.user!.id, page, pageSize);
      return sendSuccess(res, result, 'User support tickets retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message ?? 'Failed to retrieve support tickets', err.status ?? 500);
    }
  }
}
