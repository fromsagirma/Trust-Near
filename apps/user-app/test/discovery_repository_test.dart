import 'package:flutter_test/flutter_test.dart';
import 'package:user_app/core/network/api_client.dart';
import 'package:user_app/core/storage/token_storage.dart';
import 'package:user_app/features/discovery/data/datasources/discovery_remote_data_source.dart';
import 'package:user_app/features/discovery/data/repositories/discovery_repository_impl.dart';

void main() {
  group('Discovery Repository Tests', () {
    late DiscoveryRepositoryImpl repository;

    setUp(() {
      final tokenStorage = TokenStorage();
      final apiClient = ApiClient(tokenStorage: tokenStorage);
      final remoteDataSource = DiscoveryRemoteDataSource(apiClient: apiClient);
      repository = DiscoveryRepositoryImpl(remoteDataSource: remoteDataSource);
    });

    test('DiscoveryRepository returns valid fallback places when network fails', () async {
      final places = await repository.getNearbyPlaces(
        latitude: 9.0300,
        longitude: 38.7400,
      );

      expect(places.isNotEmpty, isTrue);
      expect(places.length, greaterThanOrEqualTo(2));

      final firstPlace = places.first;
      expect(firstPlace.name.isNotEmpty, isTrue);
      expect(firstPlace.rating, greaterThan(0));
      expect(firstPlace.latitude, isNot(0.0));
      expect(firstPlace.longitude, isNot(0.0));
      expect(firstPlace.landmarkDescription.isNotEmpty, isTrue);
    });

    test('DiscoveryRepository filters fallback places by category correctly', () async {
      final restaurantPlaces = await repository.getNearbyPlaces(
        latitude: 9.0300,
        longitude: 38.7400,
        categoryId: 1, // Restaurants
      );

      expect(restaurantPlaces.every((p) => p.categoryId == 1), isTrue);
    });

    test('DiscoveryRepository manages local favorites toggle', () async {
      final initialFavs = await repository.getFavorites();
      expect(initialFavs.contains('1'), isTrue);

      final removed = await repository.toggleFavorite('1');
      expect(removed, isFalse);

      final updatedFavs = await repository.getFavorites();
      expect(updatedFavs.contains('1'), isFalse);

      final added = await repository.toggleFavorite('1');
      expect(added, isTrue);
    });
  });
}
