class LocationSettingsModel {
  final String city;
  final double lat;
  final double lng;
  final double radiusKm;

  const LocationSettingsModel({
    required this.city,
    required this.lat,
    required this.lng,
    required this.radiusKm,
  });

  factory LocationSettingsModel.fromJson(Map<String, dynamic> json) {
    return LocationSettingsModel(
      city: json['city'] as String? ?? 'Addis Ababa',
      lat: (json['lat'] as num?)?.toDouble() ?? 9.03,
      lng: (json['lng'] as num?)?.toDouble() ?? 38.74,
      radiusKm: (json['radiusKm'] as num?)?.toDouble() ?? 2.4,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'city': city,
      'lat': lat,
      'lng': lng,
      'radiusKm': radiusKm,
    };
  }
}
