import 'dart:io';
import '../entities/user_profile_detail.dart';

abstract class ProfileRepository {
  Future<UserProfileDetail> getProfile();
  Future<UserProfileDetail> updateProfile({
    String? displayName,
    String? phone,
    String? profilePhotoUrl,
    String? languagePref,
  });
  Future<String> uploadProfilePhoto(File imageFile);
  Future<bool> deleteAccount();
}


