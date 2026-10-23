import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/location/location_provider.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/discovery_remote_data_source.dart';
import '../../data/repositories/discovery_repository_impl.dart';
import '../../domain/entities/place_item.dart';
import '../../domain/repositories/discovery_repository.dart';

final discoveryRemoteDataSourceProvider = Provider<DiscoveryRemoteDataSource>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return DiscoveryRemoteDataSource(apiClient: apiClient);
});

final discoveryRepositoryProvider = Provider<DiscoveryRepository>((ref) {
  final remoteDataSource = ref.watch(discoveryRemoteDataSourceProvider);
  return DiscoveryRepositoryImpl(remoteDataSource: remoteDataSource);
});

final selectedRadiusProvider = StateProvider<int>((ref) => 15000);
final selectedSortProvider = StateProvider<String>((ref) => 'distance');

final categoriesListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final repo = ref.watch(discoveryRepositoryProvider);
  return await repo.getCategories();
});

final nearbyPlacesProvider = FutureProvider<List<PlaceItem>>((ref) async {
  final repo = ref.watch(discoveryRepositoryProvider);
  final locAsync = ref.watch(userLocationProvider);
  final radius = ref.watch(selectedRadiusProvider);
  final sort = ref.watch(selectedSortProvider);

  final lat = locAsync.value?.latitude ?? 9.0300;
  final lng = locAsync.value?.longitude ?? 38.7400;

  return await repo.getNearbyPlaces(
    latitude: lat,
    longitude: lng,
    radius: radius,
    sort: sort,
  );
});

final recommendationsProvider = FutureProvider<List<PlaceItem>>((ref) async {
  final repo = ref.watch(discoveryRepositoryProvider);
  final locAsync = ref.watch(userLocationProvider);

  final lat = locAsync.value?.latitude ?? 9.0300;
  final lng = locAsync.value?.longitude ?? 38.7400;

  return await repo.getRecommendations(
    lat: lat,
    lng: lng,
    radius: 25000,
    limit: 10,
  );
});

final activePromotionsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final repo = ref.watch(discoveryRepositoryProvider);
  return await repo.getActivePromotions(page: 1, pageSize: 5);
});

class FavoritesNotifier extends StateNotifier<List<String>> {
  final DiscoveryRepository _repo;
  final Ref? _ref;

  FavoritesNotifier(this._repo, [this._ref]) : super(const []) {
    _loadFavorites();
  }

  Future<void> _loadFavorites() async {
    try {
      final favs = await _repo.getFavorites();
      state = favs;
    } catch (_) {}
  }

  Future<void> toggleFavorite(String businessId) async {
    final wasSaved = state.contains(businessId);
    if (wasSaved) {
      state = state.where((id) => id != businessId).toList();
      await _repo.removeFavorite(businessId);
    } else {
      state = [...state, businessId];
      await _repo.addFavorite(businessId);
    }
    if (_ref != null) {
      _ref.invalidate(savedPlacesDetailProvider);
    }
  }
}

final favoritesProvider = StateNotifierProvider<FavoritesNotifier, List<String>>((ref) {
  final repo = ref.watch(discoveryRepositoryProvider);
  return FavoritesNotifier(repo, ref);
});

final savedPlacesDetailProvider = FutureProvider<List<PlaceItem>>((ref) async {
  final repo = ref.watch(discoveryRepositoryProvider);
  // Re-fetch when favorites list changes
  ref.watch(favoritesProvider);
  return await repo.getFavoritesDetail();
});

