class PlaceItem {
  final String id;
  final String name;
  final int categoryId;
  final String categoryName;
  final double rating;
  final int reviewCount;
  final double latitude;
  final double longitude;
  final String landmarkDescription;
  final String locationDisplay;
  final String distanceDisplay;
  final String imageUrl;
  final bool isOpen;
  final String? phone;
  final String? description;

  const PlaceItem({
    required this.id,
    required this.name,
    required this.categoryId,
    required this.categoryName,
    required this.rating,
    required this.reviewCount,
    required this.latitude,
    required this.longitude,
    required this.landmarkDescription,
    required this.locationDisplay,
    required this.distanceDisplay,
    required this.imageUrl,
    this.isOpen = true,
    this.phone,
    this.description,
  });

  factory PlaceItem.fromJson(Map<String, dynamic> json) {
    double lat = 0.0;
    double lng = 0.0;
    if (json['location'] != null && json['location'] is Map) {
      lat = (json['location']['lat'] ?? json['location']['latitude'] ?? 0.0).toDouble();
      lng = (json['location']['lng'] ?? json['location']['longitude'] ?? 0.0).toDouble();
    } else {
      lat = (json['lat'] ?? json['latitude'] ?? 0.0).toDouble();
      lng = (json['lng'] ?? json['longitude'] ?? 0.0).toDouble();
    }

    final catId = json['categoryId'] is int
        ? json['categoryId']
        : (json['category_id'] is int
            ? json['category_id']
            : int.tryParse((json['categoryId'] ?? json['category_id'] ?? 1).toString()) ?? 1);

    String catName = json['categoryName']?.toString() ??
        (json['category'] is Map ? json['category']['name']?.toString() : json['category']?.toString()) ??
        '';

    if (catName.isEmpty || catName == 'Local Business' || catName == 'General') {
      switch (catId) {
        case 1:
          catName = 'Restaurants';
          break;
        case 2:
          catName = 'Cafés';
          break;
        case 3:
          catName = 'Tej Bet & Bars';
          break;
        case 4:
          catName = 'Hotels';
          break;
        case 5:
          catName = 'Services';
          break;
        case 6:
          catName = 'Shopping';
          break;
        case 7:
          catName = 'Healthcare';
          break;
        default:
          catName = 'Local Business';
      }
    }

    String defaultCategoryImg;
    switch (catId) {
      case 1:
        defaultCategoryImg = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80';
        break;
      case 2:
        defaultCategoryImg = 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=80';
        break;
      case 3:
        defaultCategoryImg = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80';
        break;
      case 4:
        defaultCategoryImg = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80';
        break;
      case 5:
        defaultCategoryImg = 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=900&q=80';
        break;
      case 6:
        defaultCategoryImg = 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=900&q=80';
        break;
      case 7:
        defaultCategoryImg = 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=900&q=80';
        break;
      default:
        defaultCategoryImg = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80';
    }

    String img = '';
    if (json['photos'] != null && json['photos'] is List && (json['photos'] as List).isNotEmpty) {
      final first = (json['photos'] as List).first;
      img = first is Map ? (first['url'] ?? first['imageUrl'] ?? '').toString() : first.toString();
    } else if (json['photoUrls'] != null && json['photoUrls'] is List && (json['photoUrls'] as List).isNotEmpty) {
      img = (json['photoUrls'] as List).first.toString();
    } else if (json['imageUrl'] != null || json['image'] != null) {
      img = (json['imageUrl'] ?? json['image']).toString();
    }

    if (img.trim().isEmpty) {
      img = defaultCategoryImg;
    }

    double ratingVal = 0.0;
    final rawRating = json['avgRating'] ?? json['avg_rating'] ?? json['rating'] ?? json['averageRating'];
    if (rawRating != null) {
      ratingVal = double.tryParse(rawRating.toString()) ?? 0.0;
    }

    int reviewCountVal = 0;
    final rawReviewCount = json['reviewCount'] ?? json['review_count'] ?? json['reviews'];
    if (rawReviewCount != null) {
      reviewCountVal = int.tryParse(rawReviewCount.toString()) ?? 0;
    }

    double distanceMeters = (json['distanceMeters'] ?? json['distance'] ?? 0.0).toDouble();
    String distDisplay = distanceMeters > 0
        ? (distanceMeters >= 1000
            ? '${(distanceMeters / 1000).toStringAsFixed(1)} km'
            : '${distanceMeters.toStringAsFixed(0)} m')
        : (json['distanceDisplay'] ?? 'Nearby').toString();

    return PlaceItem(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Place',
      categoryId: catId,
      categoryName: catName,
      rating: ratingVal,
      reviewCount: reviewCountVal,
      latitude: lat,
      longitude: lng,
      landmarkDescription: json['landmarkDescription']?.toString() ?? json['landmark_description']?.toString() ?? '',
      locationDisplay: json['locationDisplay']?.toString() ?? json['landmarkDescription']?.toString() ?? 'Addis Ababa',
      distanceDisplay: distDisplay,
      imageUrl: img,
      isOpen: json['isOpen'] ?? true,
      phone: json['phone']?.toString(),
      description: json['description']?.toString(),
    );
  }
}
