import '../../domain/entities/business_detail.dart';
import '../../domain/repositories/business_repository.dart';
import '../datasources/business_remote_data_source.dart';
import '../models/create_listing_request_dto.dart';

class BusinessRepositoryImpl implements BusinessRepository {
  final BusinessRemoteDataSource remoteDataSource;

  BusinessRepositoryImpl({required this.remoteDataSource});

  @override
  Future<BusinessDetail> getBusinessDetail(String id) async {
    final dto = await remoteDataSource.getBusinessDetail(id);
    return dto.toEntity();
  }

  @override
  Future<BusinessDetail> createBusiness({
    required String name,
    required int categoryId,
    required double latitude,
    required double longitude,
    required String landmarkDescription,
    String? description,
    String? phone,
    Map<String, dynamic>? hours,
    List<String>? photoUrls,
  }) async {
    final requestDto = CreateListingRequestDto(
      name: name,
      categoryId: categoryId,
      lat: latitude,
      lng: longitude,
      landmarkDescription: landmarkDescription,
      description: description,
      phone: phone,
      hours: hours,
      photoUrls: photoUrls,
    );

    final dto = await remoteDataSource.createBusiness(requestDto);
    return dto.toEntity();
  }

  @override
  Future<Map<String, dynamic>> submitClaim(String businessId, Map<String, dynamic> verificationInfo) async {
    return await remoteDataSource.submitClaim(businessId, verificationInfo);
  }

  @override
  Future<Map<String, dynamic>> verifyVisit({
    required String businessId,
    required double latitude,
    required double longitude,
    String? reviewId,
  }) async {
    return await remoteDataSource.verifyVisit(
      businessId: businessId,
      latitude: latitude,
      longitude: longitude,
      reviewId: reviewId,
    );
  }

  @override
  Future<List<BusinessDetail>> getOwnerBusinesses() async {
    final dtos = await remoteDataSource.getOwnerBusinesses();
    return dtos.map((d) => d.toEntity()).toList();
  }

  @override
  Future<BusinessDetail> updateOwnerBusiness(String businessId, Map<String, dynamic> data) async {
    final dto = await remoteDataSource.updateOwnerBusiness(businessId, data);
    return dto.toEntity();
  }

  @override
  Future<bool> replyToReview(String reviewId, String reply) async {
    return await remoteDataSource.replyToReview(reviewId, reply);
  }

  @override
  Future<Map<String, dynamic>> createPromotion(String businessId, Map<String, dynamic> promoData) async {
    return await remoteDataSource.createPromotion(businessId, promoData);
  }
}

