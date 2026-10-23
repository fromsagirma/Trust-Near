import '../../domain/entities/user_profile_detail.dart';

class UpdateProfileDto {
  final String? displayName;
  final String? phone;
  final String? profilePhotoUrl;
  final String? languagePref;

  UpdateProfileDto({
    this.displayName,
    this.phone,
    this.profilePhotoUrl,
    this.languagePref,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (displayName != null && displayName!.trim().isNotEmpty) {
      map['displayName'] = displayName!.trim();
    }
    if (phone != null && phone!.trim().isNotEmpty) {
      map['phone'] = phone!.trim();
    }
    if (profilePhotoUrl != null && profilePhotoUrl!.trim().isNotEmpty) {
      map['profilePhotoUrl'] = profilePhotoUrl!.trim();
    }
    if (languagePref != null && languagePref!.trim().isNotEmpty) {
      map['languagePref'] = languagePref!.trim();
    }
    return map;
  }
}

class UserProfileDto {
  final String id;
  final String email;
  final String displayName;
  final String? phone;
  final String role;
  final String? profilePhotoUrl;
  final String languagePref;
  final String? createdAt;

  UserProfileDto({
    required this.id,
    required this.email,
    required this.displayName,
    this.phone,
    required this.role,
    this.profilePhotoUrl,
    this.languagePref = 'en',
    this.createdAt,
  });

  factory UserProfileDto.fromJson(Map<String, dynamic> json) {
    return UserProfileDto(
      id: json['id']?.toString() ?? '',
      email: json['email'] as String? ?? '',
      displayName: json['displayName'] ?? json['name'] as String? ?? 'User',
      phone: json['phone'] as String?,
      role: json['role'] as String? ?? 'user',
      profilePhotoUrl: json['profilePhotoUrl'] as String? ?? json['profile_photo_url'] as String?,
      languagePref: json['languagePref']?.toString() ?? json['language_pref']?.toString() ?? 'en',
      createdAt: json['createdAt'] as String?,
    );
  }

  UserProfileDetail toEntity() {
    DateTime? parsedDate;
    if (createdAt != null) {
      try {
        parsedDate = DateTime.parse(createdAt!);
      } catch (_) {}
    }

    return UserProfileDetail(
      id: id,
      email: email,
      displayName: displayName,
      phone: phone,
      role: role,
      profilePhotoUrl: profilePhotoUrl,
      languagePref: languagePref,
      createdAt: parsedDate,
    );
  }
}


