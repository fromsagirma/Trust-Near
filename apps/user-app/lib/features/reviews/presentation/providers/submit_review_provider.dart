import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/review.dart';
import 'business_reviews_provider.dart';

class SubmitReviewState {
  final bool isLoading;
  final String? errorMessage;
  final Review? submittedReview;

  SubmitReviewState({
    this.isLoading = false,
    this.errorMessage,
    this.submittedReview,
  });

  SubmitReviewState copyWith({
    bool? isLoading,
    String? errorMessage,
    Review? submittedReview,
  }) {
    return SubmitReviewState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      submittedReview: submittedReview ?? this.submittedReview,
    );
  }
}

class SubmitReviewNotifier extends StateNotifier<SubmitReviewState> {
  final Ref ref;

  SubmitReviewNotifier(this.ref) : super(SubmitReviewState());

  Future<bool> submitReview({
    required String businessId,
    required int rating,
    String? comment,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final repository = ref.read(reviewsRepositoryProvider);
      final review = await repository.submitReview(
        businessId: businessId,
        rating: rating,
        comment: comment,
      );

      state = state.copyWith(isLoading: false, submittedReview: review);
      // Invalidate business reviews provider so list automatically updates
      ref.invalidate(businessReviewsProvider(businessId));
      ref.invalidate(userReviewProvider(businessId));
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  Future<bool> reportReview({
    required String reviewId,
    required String reason,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final repository = ref.read(reviewsRepositoryProvider);
      final success = await repository.reportReview(
        reviewId: reviewId,
        reason: reason,
      );

      state = state.copyWith(isLoading: false);
      return success;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }
}

final submitReviewProvider =
    StateNotifierProvider<SubmitReviewNotifier, SubmitReviewState>((ref) {
  return SubmitReviewNotifier(ref);
});
