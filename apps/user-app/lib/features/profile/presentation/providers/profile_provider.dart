import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/photo_upload_service.dart';
import '../../data/datasources/profile_remote_data_source.dart';
import '../../data/models/location_settings_model.dart';
import '../../data/models/notification_settings_model.dart';
import '../../data/repositories/profile_repository_impl.dart';
import '../../domain/entities/user_profile_detail.dart';
import '../../domain/repositories/profile_repository.dart';

final photoUploadServiceProvider = Provider<PhotoUploadService>((ref) {
  final apiClient = ApiClient(tokenStorage: ref.watch(tokenStorageProvider));
  return PhotoUploadService(apiClient: apiClient);
});

final profileRemoteDataSourceProvider = Provider<ProfileRemoteDataSource>((ref) {
  final apiClient = ApiClient(tokenStorage: ref.watch(tokenStorageProvider));
  return ProfileRemoteDataSource(apiClient: apiClient);
});

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  final remoteDataSource = ref.watch(profileRemoteDataSourceProvider);
  final photoUploadService = ref.watch(photoUploadServiceProvider);
  return ProfileRepositoryImpl(
    remoteDataSource: remoteDataSource,
    photoUploadService: photoUploadService,
  );
});

final profileProvider = FutureProvider<UserProfileDetail>((ref) async {
  final repository = ref.watch(profileRepositoryProvider);
  return await repository.getProfile();
});

final locationSettingsProvider = FutureProvider<LocationSettingsModel>((ref) async {
  final dataSource = ref.watch(profileRemoteDataSourceProvider);
  return await dataSource.getLocationSettings();
});

final notificationSettingsProvider = FutureProvider<NotificationSettingsModel>((ref) async {
  final dataSource = ref.watch(profileRemoteDataSourceProvider);
  return await dataSource.getNotificationSettings();
});

class EditProfileState {
  final bool isLoading;
  final String? errorMessage;
  final UserProfileDetail? updatedProfile;

  EditProfileState({
    this.isLoading = false,
    this.errorMessage,
    this.updatedProfile,
  });

  EditProfileState copyWith({
    bool? isLoading,
    String? errorMessage,
    UserProfileDetail? updatedProfile,
  }) {
    return EditProfileState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      updatedProfile: updatedProfile ?? this.updatedProfile,
    );
  }
}

class EditProfileNotifier extends StateNotifier<EditProfileState> {
  final Ref ref;

  EditProfileNotifier(this.ref) : super(EditProfileState());

  Future<bool> updateProfile({
    String? displayName,
    String? phone,
    String? profilePhotoUrl,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final repository = ref.read(profileRepositoryProvider);
      final profile = await repository.updateProfile(
        displayName: displayName,
        phone: phone,
        profilePhotoUrl: profilePhotoUrl,
      );

      state = state.copyWith(isLoading: false, updatedProfile: profile);
      ref.invalidate(profileProvider);

      // Sync with authProvider
      final currentUser = ref.read(authProvider).user;
      if (currentUser != null) {
        ref.read(authProvider.notifier).updateUser(
          currentUser.copyWith(
            displayName: profile.displayName,
            phone: profile.phone,
            profilePhotoUrl: profile.profilePhotoUrl,
          ),
        );
      }

      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString().replaceAll('Exception: ', ''));
      return false;
    }
  }

  Future<String?> uploadAndSetProfilePhoto(File imageFile) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final repository = ref.read(profileRepositoryProvider);
      final uploadedUrl = await repository.uploadProfilePhoto(imageFile);

      await updateProfile(profilePhotoUrl: uploadedUrl);
      return uploadedUrl;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString().replaceAll('Exception: ', ''));
      return null;
    }
  }

  Future<bool> updateLocationSettings(LocationSettingsModel settings) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final dataSource = ref.read(profileRemoteDataSourceProvider);
      await dataSource.updateLocationSettings(settings);
      state = state.copyWith(isLoading: false);
      ref.invalidate(locationSettingsProvider);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  Future<bool> updateNotificationSettings(NotificationSettingsModel settings) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final dataSource = ref.read(profileRemoteDataSourceProvider);
      await dataSource.updateNotificationSettings(settings);
      state = state.copyWith(isLoading: false);
      ref.invalidate(notificationSettingsProvider);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }
}

final editProfileProvider =

    StateNotifierProvider<EditProfileNotifier, EditProfileState>((ref) {
  return EditProfileNotifier(ref);
});


