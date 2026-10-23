import '../entities/business_detail.dart';

abstract class BusinessRepository {
  Future<BusinessDetail> getBusinessDetail(String id);
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
  });

  Future<Map<String, dynamic>> submitClaim(String businessId, Map<String, dynamic> verificationInfo);
  Future<Map<String, dynamic>> verifyVisit({
    required String businessId,
    required double latitude,
    required double longitude,
    String? reviewId,
  });
  Future<List<BusinessDetail>> getOwnerBusinesses();
  Future<BusinessDetail> updateOwnerBusiness(String businessId, Map<String, dynamic> data);
  Future<bool> replyToReview(String reviewId, String reply);
  Future<Map<String, dynamic>> createPromotion(String businessId, Map<String, dynamic> promoData);
}

