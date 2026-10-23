import '../../domain/entities/business_detail.dart';

class BusinessDetailDto {
  final String id;
  final String name;
  final int categoryId;
  final String? categoryName;
  final String? description;
  final String landmarkDescription;
  final String? phone;
  final Map<String, dynamic>? hours;
  final double averageRating;
  final int reviewCount;
  final double latitude;
  final double longitude;
  final List<String> photoUrls;

  BusinessDetailDto({
    required this.id,
    required this.name,
    required this.categoryId,
    this.categoryName,
    this.description,
    required this.landmarkDescription,
    this.phone,
    this.hours,
    required this.averageRating,
    required this.reviewCount,
    required this.latitude,
    required this.longitude,
    required this.photoUrls,
  });

  factory BusinessDetailDto.fromJson(Map<String, dynamic> json) {
    // Location can be returned as { lat, lng } or location object/coords
    double lat = 0.0;
    double lng = 0.0;

    if (json['location'] != null && json['location'] is Map) {
      lat = (json['location']['lat'] ?? json['location']['latitude'] ?? 0.0).toDouble();
      lng = (json['location']['lng'] ?? json['location']['longitude'] ?? 0.0).toDouble();
    } else {
      lat = (json['lat'] ?? json['latitude'] ?? 0.0).toDouble();
      lng = (json['lng'] ?? json['longitude'] ?? 0.0).toDouble();
    }

    List<String> photos = [];
    if (json['photos'] != null && json['photos'] is List) {
      photos = (json['photos'] as List)
          .map((p) => p is Map ? (p['url'] ?? p['imageUrl'] ?? '').toString() : p.toString())
          .where((url) => url.isNotEmpty)
          .toList();
    } else if (json['photoUrls'] != null && json['photoUrls'] is List) {
      photos = List<String>.from(json['photoUrls']);
    } else if (json['imageUrl'] != null && json['imageUrl'].toString().isNotEmpty) {
      photos.add(json['imageUrl'].toString());
    }

    if (photos.isEmpty) {
      photos.add('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80');
    }

    final catId = json['categoryId'] is int
        ? json['categoryId']
        : (json['category_id'] is int
            ? json['category_id']
            : (json['category']?['id'] is int
                ? json['category']['id']
                : int.tryParse((json['categoryId'] ?? json['category_id'] ?? 0).toString()) ?? 0));

    final catName = json['category']?['name'] as String? ??
        json['categoryName'] as String? ??
        (json['category'] is String ? json['category'] as String : null);

    double ratingVal = 0.0;
    final rawRating = json['rating'] ?? json['avgRating'] ?? json['avg_rating'] ?? json['averageRating'];
    if (rawRating != null) {
      ratingVal = double.tryParse(rawRating.toString()) ?? 0.0;
    }

    int reviewCountVal = 0;
    final rawReviews = json['reviewCount'] ?? json['review_count'] ?? json['reviews'];
    if (rawReviews != null) {
      reviewCountVal = int.tryParse(rawReviews.toString()) ?? 0;
    }

    return BusinessDetailDto(
      id: json['id']?.toString() ?? '',
      name: json['name'] as String? ?? 'Unknown',
      categoryId: catId,
      categoryName: catName,
      description: json['description'] as String?,
      landmarkDescription: json['landmarkDescription'] ?? json['landmark_description'] as String? ?? '',
      phone: json['phone'] as String?,
      hours: json['hours'] is Map<String, dynamic> ? json['hours'] as Map<String, dynamic> : null,
      averageRating: ratingVal,
      reviewCount: reviewCountVal,
      latitude: lat,
      longitude: lng,
      photoUrls: photos,
    );
  }

  BusinessDetail toEntity() {
    return BusinessDetail(
      id: id,
      name: name,
      categoryId: categoryId,
      categoryName: categoryName,
      description: description,
      landmarkDescription: landmarkDescription,
      phone: phone,
      hours: hours,
      averageRating: averageRating,
      reviewCount: reviewCount,
      latitude: latitude,
      longitude: longitude,
      photoUrls: photoUrls,
    );
  }
}
