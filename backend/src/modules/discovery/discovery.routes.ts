import { Router } from 'express';
import { optionalAuthenticate } from '../../middleware/auth';
import { DiscoveryController } from './discovery.controller';

const router = Router();

// Public recommendation feed
router.get('/public', DiscoveryController.getPublicRecommendations);

// Personalized recommendation feed (seamlessly falls back to public recommendations if unauthenticated)
router.get('/', optionalAuthenticate, DiscoveryController.getRecommendations);

export default router;
