import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/business_detail.dart';
import 'business_detail_provider.dart';

class CreateListingState {
  final bool isLoading;
  final String? errorMessage;
  final BusinessDetail? createdBusiness;

  CreateListingState({
    this.isLoading = false,
    this.errorMessage,
    this.createdBusiness,
  });

  CreateListingState copyWith({
    bool? isLoading,
    String? errorMessage,
    BusinessDetail? createdBusiness,
  }) {
    return CreateListingState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      createdBusiness: createdBusiness ?? this.createdBusiness,
    );
  }
}

class CreateListingNotifier extends StateNotifier<CreateListingState> {
  final Ref ref;

  CreateListingNotifier(this.ref) : super(CreateListingState());

  Future<bool> createListing({
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
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final repository = ref.read(businessRepositoryProvider);
      final business = await repository.createBusiness(
        name: name,
        categoryId: categoryId,
        latitude: latitude,
        longitude: longitude,
        landmarkDescription: landmarkDescription,
        description: description,
        phone: phone,
        hours: hours,
        photoUrls: photoUrls,
      );

      state = state.copyWith(isLoading: false, createdBusiness: business);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString().replaceAll('Exception: ', ''));
      return false;
    }
  }

  Future<bool> submitListing({
    required String name,
    required int categoryId,
    required double latitude,
    required double longitude,
    required String landmarkDescription,
    String? description,
    String? phone,
    Map<String, dynamic>? hours,
    List<String>? photoUrls,
  }) =>
      createListing(
        name: name,
        categoryId: categoryId,
        latitude: latitude,
        longitude: longitude,
        landmarkDescription: landmarkDescription,
        description: description,
        phone: phone,
        hours: hours,
        photoUrls: photoUrls,
      );

  void reset() {
    state = CreateListingState();
  }
}

final createListingProvider =
    StateNotifierProvider<CreateListingNotifier, CreateListingState>((ref) {
  return CreateListingNotifier(ref);
});
