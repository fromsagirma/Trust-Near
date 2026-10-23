import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class MapLauncher {
  static Future<void> launchCoordinates({
    required BuildContext context,
    required double latitude,
    required double longitude,
    String? businessName,
    String? fallbackAddress,
  }) async {
    final messenger = ScaffoldMessenger.of(context);

    // 1. If valid coordinates are provided, launch exact Google Maps pin
    if (latitude != 0.0 && longitude != 0.0) {
      final googleMapsUrl = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=$latitude,$longitude',
      );

      final geoUrl = Uri.parse(
        'geo:$latitude,$longitude?q=$latitude,$longitude${businessName != null ? "(${Uri.encodeComponent(businessName)})" : ""}',
      );

      try {
        if (await launchUrl(googleMapsUrl, mode: LaunchMode.externalApplication)) {
          return;
        }
      } catch (_) {
        try {
          if (await launchUrl(geoUrl, mode: LaunchMode.externalApplication)) {
            return;
          }
        } catch (_) {}
      }
    }

    // 2. Fallback using address or business name query
    final query = fallbackAddress ?? businessName ?? 'Addis Ababa';
    final queryUrl = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(query)}',
    );

    try {
      if (await launchUrl(queryUrl, mode: LaunchMode.externalApplication)) {
        return;
      }
    } catch (_) {}

    messenger.showSnackBar(
      const SnackBar(
        content: Text('Could not open map application.'),
        backgroundColor: Colors.red,
      ),
    );
  }
}

