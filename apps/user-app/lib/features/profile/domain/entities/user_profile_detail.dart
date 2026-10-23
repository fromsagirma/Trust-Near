class UserProfileDetail {
  final String id;
  final String email;
  final String displayName;
  final String? phone;
  final String role;
  final String? profilePhotoUrl;
  final String languagePref;
  final DateTime? createdAt;

  UserProfileDetail({
    required this.id,
    required this.email,
    required this.displayName,
    this.phone,
    required this.role,
    this.profilePhotoUrl,
    this.languagePref = 'en',
    this.createdAt,
  });

  UserProfileDetail copyWith({
    String? displayName,
    String? phone,
    String? profilePhotoUrl,
    String? languagePref,
  }) {
    return UserProfileDetail(
      id: id,
      email: email,
      displayName: displayName ?? this.displayName,
      phone: phone ?? this.phone,
      role: role,
      profilePhotoUrl: profilePhotoUrl ?? this.profilePhotoUrl,
      languagePref: languagePref ?? this.languagePref,
      createdAt: createdAt,
    );
  }
}


