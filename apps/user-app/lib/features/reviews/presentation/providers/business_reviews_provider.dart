import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/reviews_remote_data_source.dart';
import '../../data/repositories/reviews_repository_impl.dart';
import '../../domain/entities/review.dart';
import '../../domain/repositories/reviews_repository.dart';

final reviewsRemoteDataSourceProvider = Provider<ReviewsRemoteDataSource>((ref) {
  final apiClient = ApiClient(tokenStorage: ref.watch(tokenStorageProvider));
  return ReviewsRemoteDataSource(apiClient: apiClient);
});

final reviewsRepositoryProvider = Provider<ReviewsRepository>((ref) {
  final remoteDataSource = ref.watch(reviewsRemoteDataSourceProvider);
  return ReviewsRepositoryImpl(remoteDataSource: remoteDataSource);
});

final businessReviewsProvider = FutureProvider.family<List<Review>, String>((ref, businessId) async {
  final repository = ref.watch(reviewsRepositoryProvider);
  return await repository.getBusinessReviews(businessId);
});

final userReviewProvider = FutureProvider.family<Review?, String>((ref, businessId) async {
  final repository = ref.watch(reviewsRepositoryProvider);
  return await repository.getUserReview(businessId);
});
