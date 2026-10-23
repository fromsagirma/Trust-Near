import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { FavoritesService } from './favorites.service';
import { listFavoritesQuerySchema } from './favorites.validation';
import { sendSuccess, sendError } from '../../utils/response';

export class FavoritesController {
  static async add(req: AuthRequest, res: Response) {
    try {
      const favorite = await FavoritesService.addFavorite(req.params.id, req.user!.id);
      return sendSuccess(res, favorite, 'Added to favorites', 201);
    } catch (err: any) {
      return sendError(res, err.message ?? 'Failed to add favorite', err.status ?? 500);
    }
  }

  static async remove(req: AuthRequest, res: Response) {
    try {
      const result = await FavoritesService.removeFavorite(req.params.id, req.user!.id);
      return sendSuccess(res, result, 'Removed from favorites');
    } catch (err: any) {
      return sendError(res, err.message ?? 'Failed to remove favorite', err.status ?? 500);
    }
  }

  static async list(req: AuthRequest, res: Response) {
    const parsed = listFavoritesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return sendError(res, 'Invalid pagination parameters', 400, parsed.error.flatten());
    }
    try {
      const result = await FavoritesService.listFavorites(req.user!.id, parsed.data.page, parsed.data.pageSize);
      return sendSuccess(res, result, 'Favorites retrieved');
    } catch (err: any) {
      return sendError(res, err.message ?? 'Failed to retrieve favorites', err.status ?? 500);
    }
  }
}
