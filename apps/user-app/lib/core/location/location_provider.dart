import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'location_service.dart';

final locationServiceProvider = Provider<LocationService>((ref) {
  return LocationService();
});

final userLocationProvider = FutureProvider<LocationResult>((ref) async {
  final locationService = ref.watch(locationServiceProvider);
  return await locationService.getCurrentLocation(allowFallback: true);
});
