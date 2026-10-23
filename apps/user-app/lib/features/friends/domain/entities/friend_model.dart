class FriendActivity {
  final String id;
  final String title;
  final String subtitle;
  final String time;
  final String type; // 'visit', 'review', 'save'
  final String? businessId;
  final double? rating;

  FriendActivity({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.time,
    required this.type,
    this.businessId,
    this.rating,
  });
}

class FriendPlace {
  final String id;
  final String name;
  final String categoryName;
  final String landmarkDescription;
  final double rating;
  final int reviewCount;
  final String? photoUrl;

  FriendPlace({
    required this.id,
    required this.name,
    required this.categoryName,
    required this.landmarkDescription,
    required this.rating,
    required this.reviewCount,
    this.photoUrl,
  });
}

class FriendModel {
  final String id;
  final String displayName;
  final String email;
  final String? phone;
  final String? profilePhotoUrl;
  final String status; // 'connected', 'pending'
  final DateTime? connectedSince;
  final bool isActivityAllowed;
  final bool isFavoritesAllowed;
  final List<FriendActivity> activities;
  final List<FriendPlace> favoritePlaces;

  FriendModel({
    required this.id,
    required this.displayName,
    required this.email,
    this.phone,
    this.profilePhotoUrl,
    this.status = 'connected',
    this.connectedSince,
    this.isActivityAllowed = true,
    this.isFavoritesAllowed = true,
    this.activities = const [],
    this.favoritePlaces = const [],
  });

  FriendModel copyWith({
    String? id,
    String? displayName,
    String? email,
    String? phone,
    String? profilePhotoUrl,
    String? status,
    DateTime? connectedSince,
    bool? isActivityAllowed,
    bool? isFavoritesAllowed,
    List<FriendActivity>? activities,
    List<FriendPlace>? favoritePlaces,
  }) {
    return FriendModel(
      id: id ?? this.id,
      displayName: displayName ?? this.displayName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      profilePhotoUrl: profilePhotoUrl ?? this.profilePhotoUrl,
      status: status ?? this.status,
      connectedSince: connectedSince ?? this.connectedSince,
      isActivityAllowed: isActivityAllowed ?? this.isActivityAllowed,
      isFavoritesAllowed: isFavoritesAllowed ?? this.isFavoritesAllowed,
      activities: activities ?? this.activities,
      favoritePlaces: favoritePlaces ?? this.favoritePlaces,
    );
  }
}
