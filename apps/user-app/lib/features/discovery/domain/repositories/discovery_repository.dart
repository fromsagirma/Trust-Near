import '../../domain/entities/place_item.dart';

abstract class DiscoveryRepository {
  Future<List<PlaceItem>> getNearbyPlaces({
    required double latitude,
    required double longitude,
    int radius = 5000,
    int? categoryId,
    String? name,
    double? minRating,
    String sort = 'distance',
    int page = 1,
    int pageSize = 20,
  });

  Future<List<PlaceItem>> getRecommendations({
    double? lat,
    double? lng,
    int radius = 5000,
    int limit = 10,
    int? categoryId,
  });

  Future<List<Map<String, dynamic>>> getActivePromotions({
    int page = 1,
    int pageSize = 10,
  });

  Future<List<Map<String, dynamic>>> getCategories();

  Future<List<String>> getFavorites();

  Future<List<PlaceItem>> getFavoritesDetail();

  Future<bool> addFavorite(String businessId);

  Future<bool> removeFavorite(String businessId);

  Future<bool> toggleFavorite(String businessId);
}

