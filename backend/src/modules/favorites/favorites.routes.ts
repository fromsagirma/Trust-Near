import { Router } from 'express';
import { FavoritesController } from './favorites.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.post('/businesses/:id/favorite', authenticate, FavoritesController.add);
router.delete('/businesses/:id/favorite', authenticate, FavoritesController.remove);
router.get('/users/me/favorites', authenticate, FavoritesController.list);

export default router;
