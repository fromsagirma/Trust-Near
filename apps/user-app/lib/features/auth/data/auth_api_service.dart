// ignore_for_file: prefer_initializing_formals
import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/token_storage.dart';
import 'models/user_model.dart';

class AuthApiService {
  final ApiClient _apiClient;
  final TokenStorage _tokenStorage;

  AuthApiService({
    required ApiClient apiClient,
    required TokenStorage tokenStorage,
  })  : _apiClient = apiClient,
        _tokenStorage = tokenStorage;

  Future<UserModel> login(String emailOrPhone, String password) async {
    try {
      final response = await _apiClient.dio.post('/auth/login', data: {
        'emailOrPhone': emailOrPhone,
        'password': password,
      });

      if (response.data['success'] == true) {
        final data = response.data['data'];
        await _tokenStorage.saveTokens(
          accessToken: data['accessToken'],
          refreshToken: data['refreshToken'],
        );
        return UserModel.fromJson(data['user']);
      } else {
        throw Exception(response.data['error'] ?? 'Login failed');
      }
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  Future<void> register({
    required String displayName,
    required String email,
    required String password,
  }) async {
    try {
      final response = await _apiClient.dio.post('/auth/register', data: {
        'displayName': displayName,
        'email': email,
        'password': password,
      });

      if (response.data['success'] != true) {
        throw Exception(response.data['error'] ?? 'Registration failed');
      }
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  Future<UserModel> getCurrentUser() async {
    try {
      final response = await _apiClient.dio.get('/auth/me');

      if (response.data['success'] == true) {
        return UserModel.fromJson(response.data['data']);
      } else {
        throw Exception(response.data['error'] ?? 'Failed to get user');
      }
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  Future<void> logout() async {
    try {
      final refreshToken = await _tokenStorage.getRefreshToken();
      if (refreshToken != null) {
        await _apiClient.dio.post('/auth/logout', data: {
          'refreshToken': refreshToken,
        });
      }
    } catch (_) {
      // Ignore network errors on logout, we still want to clear local state
    } finally {
      await _tokenStorage.clearTokens();
    }
  }

  Future<void> forgotPassword(String identifier) async {
    try {
      final response = await _apiClient.dio.post('/auth/forgot-password', data: {
        'identifier': identifier,
        'email': identifier,
      });

      if (response.data['success'] != true) {
        throw Exception(response.data['error'] ?? response.data['message'] ?? 'Failed to request password reset');
      }
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    try {
      final response = await _apiClient.dio.post('/auth/reset-password', data: {
        'token': token,
        'newPassword': newPassword,
      });

      if (response.data['success'] != true) {
        throw Exception(response.data['error'] ?? response.data['message'] ?? 'Failed to reset password');
      }
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }


  String _extractErrorMessage(DioException e) {
    if (e.response != null && e.response?.data != null) {
      if (e.response?.data is Map) {
        return e.response?.data['error'] ?? e.response?.data['message'] ?? 'An error occurred';
      }
    }
    if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout) {
      return 'Connection timed out. Please check your internet.';
    }
    return 'Network error occurred. Please try again.';
  }
}
