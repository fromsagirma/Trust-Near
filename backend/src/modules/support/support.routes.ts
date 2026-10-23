import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { SupportController } from './support.controller';

const router = Router();

// All support ticket endpoints require authentication
router.use(authenticate);

router.post('/support/tickets', SupportController.createTicket);
router.get('/support/tickets', SupportController.getMyTickets);

export default router;
