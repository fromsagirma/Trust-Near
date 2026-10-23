import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../models/activity_model.dart';

class ActivityRemoteDataSource {
  final ApiClient apiClient;

  ActivityRemoteDataSource({required this.apiClient});

  Future<List<ActivityModel>> getUserActivities({int page = 1, int pageSize = 20}) async {
    try {
      final response = await apiClient.dio.get(
        '/users/me/activity',
        queryParameters: {'page': page, 'pageSize': pageSize},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final List items = response.data['data']['data'] ?? [];
        return items.map((json) => ActivityModel.fromJson(json)).toList();
      }
      return [];
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) return [];
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Failed to load user activity');
    } catch (_) {
      return [];
    }
  }

  Future<ActivityStatsModel> getActivityStats() async {
    try {
      final response = await apiClient.dio.get('/users/me/activity/stats');
      if (response.statusCode == 200 && response.data['success'] == true) {
        return ActivityStatsModel.fromJson(response.data['data']);
      }
      return const ActivityStatsModel(savedPlaces: 0, reviews: 0, recentlyVisited: 0);
    } catch (_) {
      return const ActivityStatsModel(savedPlaces: 0, reviews: 0, recentlyVisited: 0);
    }
  }

  Future<bool> recordVisit(String businessId, {double? lat, double? lng}) async {
    try {
      final response = await apiClient.dio.post(
        '/users/me/activity/visit',
        data: {
          'businessId': businessId,
          if (lat != null && lng != null) 'location': {'lat': lat, 'lng': lng},
        },
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }
}
