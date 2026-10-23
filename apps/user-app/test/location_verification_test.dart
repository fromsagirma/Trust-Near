import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';

void main() {
  group('500m Distance Verification Logic Tests', () {
    const businessLat = 9.0300;
    const businessLng = 38.7400;

    test('Distance <= 500m is considered "currently at location"', () {
      // User is ~100m away
      const userLat = 9.0305;
      const userLng = 38.7405;

      final distance = Geolocator.distanceBetween(
        userLat,
        userLng,
        businessLat,
        businessLng,
      );

      expect(distance <= 500.0, isTrue);
    });

    test('Distance > 500m is considered "away from location"', () {
      // User is ~2km away in Bole
      const userLat = 9.0054;
      const userLng = 38.7881;

      final distance = Geolocator.distanceBetween(
        userLat,
        userLng,
        businessLat,
        businessLng,
      );

      expect(distance > 500.0, isTrue);
    });
  });
}
