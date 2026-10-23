class UserModel {
  final String id;
  final String displayName;
  final String? email;
  final String? phone;
  final String? role;
  final String? languagePref;
  final String? profilePhotoUrl;
  final String? createdAt;

  UserModel({
    required this.id,
    required this.displayName,
    this.email,
    this.phone,
    this.role,
    this.languagePref,
    this.profilePhotoUrl,
    this.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      displayName: json['displayName']?.toString() ?? json['name']?.toString() ?? 'User',
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      role: json['role']?.toString(),
      languagePref: json['languagePref']?.toString() ?? 'en',
      profilePhotoUrl: json['profilePhotoUrl']?.toString(),
      createdAt: json['createdAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'displayName': displayName,
      'email': email,
      'phone': phone,
      'role': role,
      'languagePref': languagePref,
      'profilePhotoUrl': profilePhotoUrl,
      'createdAt': createdAt,
    };
  }

  UserModel copyWith({
    String? id,
    String? displayName,
    String? email,
    String? phone,
    String? role,
    String? languagePref,
    String? profilePhotoUrl,
    String? createdAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      displayName: displayName ?? this.displayName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      role: role ?? this.role,
      languagePref: languagePref ?? this.languagePref,
      profilePhotoUrl: profilePhotoUrl ?? this.profilePhotoUrl,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
