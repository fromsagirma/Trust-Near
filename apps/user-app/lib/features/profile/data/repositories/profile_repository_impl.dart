import 'dart:io';
import '../../domain/entities/user_profile_detail.dart';
import '../../domain/repositories/profile_repository.dart';
import '../datasources/photo_upload_service.dart';
import '../datasources/profile_remote_data_source.dart';
import '../models/update_profile_dto.dart';

class ProfileRepositoryImpl implements ProfileRepository {
  final ProfileRemoteDataSource remoteDataSource;
  final PhotoUploadService photoUploadService;

  ProfileRepositoryImpl({
    required this.remoteDataSource,
    required this.photoUploadService,
  });

  @override
  Future<UserProfileDetail> getProfile() async {
    final dto = await remoteDataSource.getProfile();
    return dto.toEntity();
  }

  @override
  Future<UserProfileDetail> updateProfile({
    String? displayName,
    String? phone,
    String? profilePhotoUrl,
    String? languagePref,
  }) async {
    final dto = await remoteDataSource.updateProfile(
      UpdateProfileDto(
        displayName: displayName,
        phone: phone,
        profilePhotoUrl: profilePhotoUrl,
        languagePref: languagePref,
      ),
    );
    return dto.toEntity();
  }



  @override
  Future<String> uploadProfilePhoto(File imageFile) async {
    return await photoUploadService.uploadImage(imageFile);
  }

  @override
  Future<bool> deleteAccount() async {
    return await remoteDataSource.deleteAccount();
  }
}
