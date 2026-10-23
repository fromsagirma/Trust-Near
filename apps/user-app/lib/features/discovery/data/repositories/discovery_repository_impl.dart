import '../../domain/entities/place_item.dart';
import '../../domain/repositories/discovery_repository.dart';
import '../datasources/discovery_remote_data_source.dart';

class DiscoveryRepositoryImpl implements DiscoveryRepository {
  final DiscoveryRemoteDataSource remoteDataSource;

  DiscoveryRepositoryImpl({required this.remoteDataSource});

  @override
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
  }) async {
    return await remoteDataSource.getNearbyBusinesses(
      latitude: latitude,
      longitude: longitude,
      radius: radius,
      categoryId: categoryId,
      name: name,
      minRating: minRating,
      sort: sort,
      page: page,
      pageSize: pageSize,
    );
  }

  @override
  Future<List<PlaceItem>> getRecommendations({
    double? lat,
    double? lng,
    int radius = 5000,
    int limit = 10,
    int? categoryId,
  }) async {
    return await remoteDataSource.getRecommendations(
      lat: lat,
      lng: lng,
      radius: radius,
      limit: limit,
      categoryId: categoryId,
    );
  }

  @override
  Future<List<Map<String, dynamic>>> getActivePromotions({
    int page = 1,
    int pageSize = 10,
  }) async {
    return await remoteDataSource.getActivePromotions(
      page: page,
      pageSize: pageSize,
    );
  }

  @override
  Future<List<Map<String, dynamic>>> getCategories() async {
    return await remoteDataSource.getCategories();
  }

  @override
  Future<List<String>> getFavorites() async {
    return await remoteDataSource.getFavoriteBusinessIds();
  }

  @override
  Future<List<PlaceItem>> getFavoritesDetail() async {
    return await remoteDataSource.getFavoritesDetail();
  }

  @override
  Future<bool> addFavorite(String businessId) async {
    return await remoteDataSource.addFavorite(businessId);
  }

  @override
  Future<bool> removeFavorite(String businessId) async {
    return await remoteDataSource.removeFavorite(businessId);
  }

  @override
  Future<bool> toggleFavorite(String businessId) async {
    final currentFavs = await remoteDataSource.getFavoriteBusinessIds();
    final isFav = currentFavs.contains(businessId);
    if (isFav) {
      return !(await remoteDataSource.removeFavorite(businessId));
    } else {
      return await remoteDataSource.addFavorite(businessId);
    }
  }
}

