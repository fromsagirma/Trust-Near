import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/place_item.dart';

class DiscoveryRemoteDataSource {
  final ApiClient apiClient;

  DiscoveryRemoteDataSource({required this.apiClient});

  Future<List<PlaceItem>> getNearbyBusinesses({
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
    try {
      final validRadius = radius.clamp(100, 100000);

      final queryParams = <String, dynamic>{
        'lat': latitude,
        'lng': longitude,
        'radius': validRadius,
        'sort': sort,
        'page': page,
        'pageSize': pageSize,
      };
      if (categoryId != null) {
        queryParams['categoryId'] = categoryId;
      }
      if (name != null && name.trim().isNotEmpty) {
        queryParams['name'] = name.trim();
      }
      if (minRating != null && minRating > 0) {
        queryParams['minRating'] = minRating;
      }

      final response = await apiClient.dio.get(
        '/businesses/nearby',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        List itemsList = [];
        if (data is List) {
          itemsList = data;
        } else if (data is Map && data['data'] is List) {
          itemsList = data['data'];
        } else if (data is Map && data['businesses'] is List) {
          itemsList = data['businesses'];
        } else if (data is Map && data['items'] is List) {
          itemsList = data['items'];
        }

        return itemsList.map((item) => PlaceItem.fromJson(item)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<List<PlaceItem>> getRecommendations({
    double? lat,
    double? lng,
    int radius = 5000,
    int limit = 10,
    int? categoryId,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'lat': lat ?? 9.0300,
        'lng': lng ?? 38.7400,
        'radius': radius,
        'limit': limit,
      };
      if (categoryId != null) queryParams['categoryId'] = categoryId;

      Response response;
      try {
        response = await apiClient.dio.get(
          '/recommendations',
          queryParameters: queryParams,
        );
      } catch (_) {
        // Fallback to public endpoint if unauthenticated
        response = await apiClient.dio.get(
          '/recommendations/public',
          queryParameters: queryParams,
        );
      }

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        List itemsList = [];
        if (data is List) {
          itemsList = data;
        } else if (data is Map && data['data'] is List) {
          itemsList = data['data'];
        } else if (data is Map && data['recommendations'] is List) {
          itemsList = data['recommendations'];
        } else if (data is Map && data['businesses'] is List) {
          itemsList = data['businesses'];
        }

        return itemsList.map((item) {
          final businessData = item is Map && item['business'] is Map
              ? item['business']
              : item;
          return PlaceItem.fromJson(businessData);
        }).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> getActivePromotions({
    int page = 1,
    int pageSize = 10,
  }) async {
    try {
      final response = await apiClient.dio.get(
        '/promotions/active',
        queryParameters: {'page': page, 'pageSize': pageSize},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        if (data is List) {
          return List<Map<String, dynamic>>.from(data);
        } else if (data is Map && data['data'] is List) {
          return List<Map<String, dynamic>>.from(data['data']);
        } else if (data is Map && data['items'] is List) {
          return List<Map<String, dynamic>>.from(data['items']);
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> getCategories() async {
    try {
      final response = await apiClient.dio.get('/categories');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        if (data is Map && data['categories'] is List) {
          return List<Map<String, dynamic>>.from(data['categories']);
        } else if (data is Map && data['data'] is List) {
          return List<Map<String, dynamic>>.from(data['data']);
        } else if (data is List) {
          return List<Map<String, dynamic>>.from(data);
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<List<String>> getFavoriteBusinessIds() async {
    try {
      final response = await apiClient.dio.get('/users/me/favorites');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        List list = [];
        if (data is List) {
          list = data;
        } else if (data is Map && data['items'] is List) {
          list = data['items'];
        } else if (data is Map && data['favorites'] is List) {
          list = data['favorites'];
        } else if (data is Map && data['data'] is List) {
          list = data['data'];
        }

        return list
            .map(
              (fav) =>
                  (fav is Map ? (fav['businessId'] ?? fav['business']?['id'] ?? fav['id']) : fav)
                      .toString(),
            )
            .where((id) => id.isNotEmpty && id != 'null')
            .toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<List<PlaceItem>> getFavoritesDetail() async {
    try {
      final response = await apiClient.dio.get('/users/me/favorites');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        List itemsList = [];
        if (data is List) {
          itemsList = data;
        } else if (data is Map && data['items'] is List) {
          itemsList = data['items'];
        } else if (data is Map && data['favorites'] is List) {
          itemsList = data['favorites'];
        } else if (data is Map && data['data'] is List) {
          itemsList = data['data'];
        }

        return itemsList.map((fav) {
          final businessData = fav is Map && fav['business'] is Map
              ? fav['business']
              : fav;
          return PlaceItem.fromJson(businessData);
        }).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<bool> addFavorite(String businessId) async {
    try {
      final response = await apiClient.dio.post(
        '/businesses/$businessId/favorite',
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  Future<bool> removeFavorite(String businessId) async {
    try {
      final response = await apiClient.dio.delete(
        '/businesses/$businessId/favorite',
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
