import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../models/business_detail_dto.dart';
import '../models/create_listing_request_dto.dart';

class BusinessRemoteDataSource {
  final ApiClient apiClient;

  BusinessRemoteDataSource({required this.apiClient});

  Future<BusinessDetailDto> getBusinessDetail(String id) async {
    try {
      final response = await apiClient.dio.get('/businesses/$id');
      if (response.statusCode == 200 && response.data['success'] == true) {
        return BusinessDetailDto.fromJson(response.data['data']);
      }
      throw Exception(response.data['message'] ?? 'Failed to load business details');
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw Exception('Business not found');
      }
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Error fetching business detail');
    }
  }

  Future<BusinessDetailDto> createBusiness(CreateListingRequestDto requestDto) async {
    try {
      final response = await apiClient.dio.post(
        '/businesses',
        data: requestDto.toJson(),
      );

      if ((response.statusCode == 200 || response.statusCode == 201) && response.data['success'] == true) {
        return BusinessDetailDto.fromJson(response.data['data']);
      }
      throw Exception(response.data['message'] ?? 'Failed to create business listing');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Error creating business');
    }
  }

  Future<Map<String, dynamic>> submitClaim(String businessId, Map<String, dynamic> verificationInfo) async {
    try {
      final response = await apiClient.dio.post(
        '/businesses/$businessId/claim',
        data: {'verificationInfo': verificationInfo},
      );

      if ((response.statusCode == 200 || response.statusCode == 201) && response.data['success'] == true) {
        return response.data['data'] ?? {};
      }
      throw Exception(response.data['message'] ?? 'Failed to submit ownership claim');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Error submitting claim');
    }
  }

  Future<Map<String, dynamic>> verifyVisit({
    required String businessId,
    required double latitude,
    required double longitude,
    String? reviewId,
  }) async {
    try {
      final path = reviewId != null
          ? '/businesses/$businessId/reviews/$reviewId/verify'
          : '/businesses/$businessId/reviews/verify';

      final response = await apiClient.dio.post(
        path,
        data: {
          'lat': latitude,
          'lng': longitude,
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return response.data['data'] ?? {};
      }
      throw Exception(response.data['message'] ?? 'Could not verify visit location');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Error verifying visit');
    }
  }

  Future<List<BusinessDetailDto>> getOwnerBusinesses() async {
    try {
      final response = await apiClient.dio.get('/owner/businesses');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        List list = [];
        if (data is List) {
          list = data;
        } else if (data is Map && data['data'] is List) {
          list = data['data'];
        } else if (data is Map && data['businesses'] is List) {
          list = data['businesses'];
        }
        return list.map((b) => BusinessDetailDto.fromJson(b)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<BusinessDetailDto> updateOwnerBusiness(String businessId, Map<String, dynamic> data) async {
    try {
      final response = await apiClient.dio.patch(
        '/owner/businesses/$businessId',
        data: data,
      );
      if (response.statusCode == 200 && response.data['success'] == true) {
        return BusinessDetailDto.fromJson(response.data['data']);
      }
      throw Exception(response.data['message'] ?? 'Failed to update business');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Error updating business');
    }
  }

  Future<bool> replyToReview(String reviewId, String reply) async {
    try {
      final response = await apiClient.dio.post(
        '/owner/reviews/$reviewId/reply',
        data: {'reply': reply},
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to post reply');
    }
  }

  Future<Map<String, dynamic>> createPromotion(String businessId, Map<String, dynamic> promoData) async {
    try {
      final response = await apiClient.dio.post(
        '/owner/businesses/$businessId/promotions',
        data: promoData,
      );
      if ((response.statusCode == 200 || response.statusCode == 201) && response.data['success'] == true) {
        return response.data['data'] ?? {};
      }
      throw Exception(response.data['message'] ?? 'Failed to create promotion');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Error creating promotion');
    }
  }
}

