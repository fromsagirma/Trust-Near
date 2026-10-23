import '../entities/review.dart';

abstract class ReviewsRepository {
  Future<List<Review>> getBusinessReviews(String businessId);
  Future<Review?> getUserReview(String businessId);
  Future<Review> submitReview({
    required String businessId,
    required int rating,
    String? comment,
  });
  Future<bool> reportReview({
    required String reviewId,
    required String reason,
  });
}
