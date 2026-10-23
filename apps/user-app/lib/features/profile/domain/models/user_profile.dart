class UserProfile {
  final String fullName;
  final String email;
  final String phone;
  final String dateOfBirth;
  final String memberSince;
  final String profileImage;
  final int savedPlaces;
  final int reviews;
  final int recentlyVisited;

  const UserProfile({
    required this.fullName,
    required this.email,
    required this.phone,
    required this.dateOfBirth,
    required this.memberSince,
    required this.profileImage,
    required this.savedPlaces,
    required this.reviews,
    required this.recentlyVisited,
  });

  UserProfile copyWith({
    String? fullName,
    String? email,
    String? phone,
    String? dateOfBirth,
    String? memberSince,
    String? profileImage,
    int? savedPlaces,
    int? reviews,
    int? recentlyVisited,
  }) {
    return UserProfile(
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      memberSince: memberSince ?? this.memberSince,
      profileImage: profileImage ?? this.profileImage,
      savedPlaces: savedPlaces ?? this.savedPlaces,
      reviews: reviews ?? this.reviews,
      recentlyVisited: recentlyVisited ?? this.recentlyVisited,
    );
  }
}