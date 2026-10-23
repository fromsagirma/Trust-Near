class CreateListingRequestDto {
  final String name;
  final int categoryId;
  final double lat;
  final double lng;
  final String landmarkDescription;
  final String? description;
  final String? phone;
  final Map<String, dynamic>? hours;
  final List<String>? photoUrls;

  CreateListingRequestDto({
    required this.name,
    required this.categoryId,
    required this.lat,
    required this.lng,
    required this.landmarkDescription,
    this.description,
    this.phone,
    this.hours,
    this.photoUrls,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'name': name,
      'categoryId': categoryId,
      'location': {
        'lat': lat,
        'lng': lng,
      },
      'landmarkDescription': landmarkDescription,
    };

    if (description != null && description!.isNotEmpty) {
      map['description'] = description;
    }
    if (phone != null && phone!.isNotEmpty) {
      map['phone'] = phone;
    }
    if (hours != null) {
      map['hours'] = hours;
    }
    if (photoUrls != null && photoUrls!.isNotEmpty) {
      map['photoUrls'] = photoUrls;
    }

    return map;
  }
}
