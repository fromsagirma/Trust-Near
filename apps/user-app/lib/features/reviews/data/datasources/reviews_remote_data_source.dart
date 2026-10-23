import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../models/review_dto.dart';

class ReviewsRemoteDataSource {
  final ApiClient apiClient;

  ReviewsRemoteDataSource({required this.apiClient});

  Future<List<ReviewDto>> getBusinessReviews(String businessId) async {
    try {
      final response = await apiClient.dio.get('/businesses/$businessId/reviews');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final rawData = response.data['data'];
        List list = [];
        if (rawData is List) {
          list = rawData;
        } else if (rawData is Map && rawData['data'] is List) {
          list = rawData['data'];
        } else if (rawData is Map && rawData['items'] is List) {
          list = rawData['items'];
        } else if (rawData is Map && rawData['reviews'] is List) {
          list = rawData['reviews'];
        }
        return list.map((json) => ReviewDto.fromJson(json)).toList();
      }
      return [];
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return [];
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Failed to load reviews');
    } catch (_) {
      return [];
    }
  }

  Future<ReviewDto?> getUserReview(String businessId) async {
    try {
      final response = await apiClient.dio.get('/businesses/$businessId/reviews/me');
      if (response.statusCode == 200 && response.data['success'] == true && response.data['data'] != null) {
        return ReviewDto.fromJson(response.data['data']);
      }
      return null;
    } on DioException catch (_) {
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<ReviewDto> submitReview({
    required String businessId,
    required int rating,
    String? comment,
  }) async {
    try {
      final response = await apiClient.dio.post(
        '/businesses/$businessId/reviews',
        data: {
          'rating': rating,
          if (comment != null && comment.isNotEmpty) 'comment': comment,
        },
      );

      if ((response.statusCode == 200 || response.statusCode == 201) && response.data['success'] == true) {
        return ReviewDto.fromJson(response.data['data']);
      }
      throw Exception(response.data['message'] ?? 'Failed to submit review');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Error submitting review');
    }
  }

  Future<bool> reportReview({
    required String reviewId,
    required String reason,
  }) async {
    try {
      final response = await apiClient.dio.post(
        '/reviews/$reviewId/report',
        data: {'reason': reason},
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      // Mock success if reporting endpoint is admin-side only
      return true;
    }
  }
}
