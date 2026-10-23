import 'package:geolocator/geolocator.dart';

class LocationResult {
  final double latitude;
  final double longitude;
  final String locationName;
  final bool isAccurate;
  final String? message;

  const LocationResult({
    required this.latitude,
    required this.longitude,
    required this.locationName,
    this.isAccurate = true,
    this.message,
  });

  // Default fallback to Addis Ababa center
  static const LocationResult defaultLocation = LocationResult(
    latitude: 9.0300,
    longitude: 38.7400,
    locationName: 'Addis Ababa',
    isAccurate: false,
    message: 'Using default city location',
  );
}

class LocationService {
  Future<LocationResult> getCurrentLocation({bool allowFallback = true}) async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (allowFallback) return LocationResult.defaultLocation;
        throw Exception('Location services are disabled on your device.');
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (allowFallback) return LocationResult.defaultLocation;
          throw Exception('Location permissions were denied.');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        if (allowFallback) return LocationResult.defaultLocation;
        throw Exception(
          'Location permissions are permanently denied. Please enable them in device settings.',
        );
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );

      return LocationResult(
        latitude: position.latitude,
        longitude: position.longitude,
        locationName: 'Addis Ababa',
        isAccurate: true,
      );
    } catch (e) {
      if (allowFallback) {
        return LocationResult.defaultLocation;
      }
      rethrow;
    }
  }

  Future<Position> getCurrentPosition() async {
    final result = await getCurrentLocation(allowFallback: false);
    return Position(
      longitude: result.longitude,
      latitude: result.latitude,
      timestamp: DateTime.now(),
      accuracy: result.isAccurate ? 5.0 : 5000.0,
      altitude: 0.0,
      altitudeAccuracy: 0.0,
      heading: 0.0,
      headingAccuracy: 0.0,
      speed: 0.0,
      speedAccuracy: 0.0,
    );
  }
}
