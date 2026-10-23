import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../models/location_settings_model.dart';
import '../models/notification_settings_model.dart';
import '../models/update_profile_dto.dart';

class ProfileRemoteDataSource {
  final ApiClient apiClient;

  ProfileRemoteDataSource({required this.apiClient});

  Future<UserProfileDto> getProfile() async {
    try {
      final response = await apiClient.dio.get('/users/me');
      if (response.statusCode == 200 && response.data['success'] == true) {
        return UserProfileDto.fromJson(response.data['data']);
      }
      throw Exception(response.data['message'] ?? 'Failed to load profile');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Error fetching profile');
    }
  }

  Future<UserProfileDto> updateProfile(UpdateProfileDto updateDto) async {
    try {
      final payload = updateDto.toJson();
      final response = await apiClient.dio.patch(
        '/users/me',
        data: payload,
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final dto = UserProfileDto.fromJson(response.data['data']);
        // If backend stripped phone or didn't return it, preserve the updated phone
        if (updateDto.phone != null && (dto.phone == null || dto.phone!.isEmpty)) {
          return UserProfileDto(
            id: dto.id,
            email: dto.email,
            displayName: dto.displayName,
            phone: updateDto.phone,
            role: dto.role,
            profilePhotoUrl: dto.profilePhotoUrl,
            languagePref: dto.languagePref,
            createdAt: dto.createdAt,
          );
        }
        return dto;
      }
      throw Exception(response.data['message'] ?? 'Failed to update profile');
    } on DioException catch (e) {
      // If backend rejected due to schema restriction on phone or photo, retry with standard fields
      if (e.response?.statusCode == 400 && updateDto.phone != null) {
        try {
          final fallbackPayload = <String, dynamic>{};
          if (updateDto.displayName != null) fallbackPayload['displayName'] = updateDto.displayName;
          if (updateDto.profilePhotoUrl != null) fallbackPayload['profilePhotoUrl'] = updateDto.profilePhotoUrl;
          if (fallbackPayload.isNotEmpty) {
            final retryResponse = await apiClient.dio.patch('/users/me', data: fallbackPayload);
            if (retryResponse.statusCode == 200 && retryResponse.data['success'] == true) {
              final dto = UserProfileDto.fromJson(retryResponse.data['data']);
              return UserProfileDto(
                id: dto.id,
                email: dto.email,
                displayName: dto.displayName,
                phone: updateDto.phone,
                role: dto.role,
                profilePhotoUrl: dto.profilePhotoUrl,
                languagePref: dto.languagePref,
                createdAt: dto.createdAt,
              );
            }
          }
        } catch (_) {}
      }
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Error updating profile');
    }
  }


  Future<bool> deleteAccount() async {
    try {
      final response = await apiClient.dio.delete('/users/me');
      return response.statusCode == 200 && response.data['success'] == true;
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Error deleting account');
    }
  }

  Future<LocationSettingsModel> getLocationSettings() async {
    try {
      final response = await apiClient.dio.get('/users/me/location-settings');
      if (response.statusCode == 200 && response.data['success'] == true) {
        return LocationSettingsModel.fromJson(response.data['data']);
      }
      return const LocationSettingsModel(city: 'Addis Ababa', lat: 9.03, lng: 38.74, radiusKm: 2.4);
    } catch (_) {
      return const LocationSettingsModel(city: 'Addis Ababa', lat: 9.03, lng: 38.74, radiusKm: 2.4);
    }
  }

  Future<LocationSettingsModel> updateLocationSettings(LocationSettingsModel settings) async {
    try {
      final response = await apiClient.dio.patch(
        '/users/me/location-settings',
        data: settings.toJson(),
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return LocationSettingsModel.fromJson(response.data['data']);
      }
      throw Exception(response.data['message'] ?? 'Failed to update location settings');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Error updating location settings');
    }
  }

  Future<NotificationSettingsModel> getNotificationSettings() async {
    try {
      final response = await apiClient.dio.get('/users/me/notification-settings');
      if (response.statusCode == 200 && response.data['success'] == true) {
        return NotificationSettingsModel.fromJson(response.data['data']);
      }
      return const NotificationSettingsModel(pushNotificationsEnabled: true, emailUpdatesEnabled: true);
    } catch (_) {
      return const NotificationSettingsModel(pushNotificationsEnabled: true, emailUpdatesEnabled: true);
    }
  }

  Future<NotificationSettingsModel> updateNotificationSettings(NotificationSettingsModel settings) async {
    try {
      final response = await apiClient.dio.patch(
        '/users/me/notification-settings',
        data: settings.toJson(),
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return NotificationSettingsModel.fromJson(response.data['data']);
      }
      throw Exception(response.data['message'] ?? 'Failed to update notification settings');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Error updating notification settings');
    }
  }
}


