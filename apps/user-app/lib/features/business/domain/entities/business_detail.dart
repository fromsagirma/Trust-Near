class BusinessDetail {
  final String id;
  final String name;
  final String? categoryName;
  final int categoryId;
  final String? description;
  final String landmarkDescription;
  final String? phone;
  final Map<String, dynamic>? hours;
  final double averageRating;
  final int reviewCount;
  final double latitude;
  final double longitude;
  final List<String> photoUrls;

  BusinessDetail({
    required this.id,
    required this.name,
    this.categoryName,
    required this.categoryId,
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
}
