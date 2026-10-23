import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/auth_api_service.dart';
import '../../data/models/user_model.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/storage/token_storage.dart';

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

final apiClientProvider = Provider<ApiClient>((ref) {
  final tokenStorage = ref.watch(tokenStorageProvider);
  return ApiClient(tokenStorage: tokenStorage);
});

final authApiServiceProvider = Provider<AuthApiService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final tokenStorage = ref.watch(tokenStorageProvider);
  return AuthApiService(apiClient: apiClient, tokenStorage: tokenStorage);
});

enum AuthStatus { initial, loading, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final UserModel? user;
  final String? errorMessage;

  AuthState({
    required this.status,
    this.user,
    this.errorMessage,
  });

  factory AuthState.initial() => AuthState(status: AuthStatus.initial);
  factory AuthState.loading() => AuthState(status: AuthStatus.loading);
  factory AuthState.authenticated(UserModel user) =>
      AuthState(status: AuthStatus.authenticated, user: user);
  factory AuthState.unauthenticated({String? errorMessage}) =>
      AuthState(status: AuthStatus.unauthenticated, errorMessage: errorMessage);
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthApiService _apiService;
  final TokenStorage _tokenStorage;

  AuthNotifier(this._apiService, this._tokenStorage) : super(AuthState.initial()) {
    checkAuthStatus();
  }

  /// Evaluates role access. Returns null if allowed, or an error message if disallowed.
  String? _validateRoleAccess(String? role) {
    if (role == null || role.isEmpty) return null; // Default normal user
    final normalized = role.toLowerCase().trim();

    if (normalized == 'user' || normalized == 'guest_promoted' || normalized == 'registered_user' || normalized == 'client') {
      return null;
    }

    if (normalized == 'business_owner' || normalized == 'owner') {
      return 'This account is registered as a Business Owner. Business owners must use the TrustNear Web Portal to manage listings and access business tools.';
    }

    if (normalized == 'admin' || normalized == 'seed_admin' || normalized == 'moderator') {
      return 'This account has Administrative privileges. Administrators must use the TrustNear Admin Portal.';
    }

    return 'Access denied: Your account role ($role) is not authorized for the TrustNear mobile application.';
  }

  Future<void> checkAuthStatus() async {
    state = AuthState.loading();
    final refreshToken = await _tokenStorage.getRefreshToken();

    if (refreshToken == null) {
      state = AuthState.unauthenticated();
      return;
    }

    try {
      final user = await _apiService.getCurrentUser();
      final roleError = _validateRoleAccess(user.role);

      if (roleError == null) {
        state = AuthState.authenticated(user);
      } else {
        await _tokenStorage.clearTokens();
        state = AuthState.unauthenticated(errorMessage: roleError);
      }
    } catch (e) {
      final hasToken = await _tokenStorage.getRefreshToken() != null;
      if (hasToken) {
        state = AuthState.unauthenticated(
          errorMessage: e.toString().replaceAll('Exception: ', ''),
        );
      } else {
        state = AuthState.unauthenticated();
      }
    }
  }

  Future<void> login(String email, String password) async {
    state = AuthState.loading();
    try {
      final user = await _apiService.login(email, password);
      final roleError = _validateRoleAccess(user.role);

      if (roleError == null) {
        state = AuthState.authenticated(user);
      } else {
        await _tokenStorage.clearTokens();
        state = AuthState.unauthenticated(errorMessage: roleError);
        throw Exception(roleError);
      }
    } catch (e) {
      final msg = e.toString().replaceAll('Exception: ', '');
      state = AuthState.unauthenticated(errorMessage: msg);
      throw Exception(msg);
    }
  }

  Future<void> register(String displayName, String email, String password, {String? phone}) async {
    state = AuthState.loading();
    try {
      await _apiService.register(displayName: displayName, email: email, password: password);
      state = AuthState.unauthenticated();
    } catch (e) {
      final msg = e.toString().replaceAll('Exception: ', '');
      state = AuthState.unauthenticated(errorMessage: msg);
      throw Exception(msg);
    }
  }

  void loginDemoUser() {
    state = AuthState.authenticated(
      UserModel(
        id: 'demo-user-1',
        email: 'demo@trustnear.com',
        displayName: 'TrustNear Explorer',
        role: 'user',
      ),
    );
  }


  void updateUser(UserModel updatedUser) {
    if (state.status == AuthStatus.authenticated) {
      state = AuthState.authenticated(updatedUser);
    }
  }

  Future<void> logout() async {
    state = AuthState.loading();
    await _apiService.logout();
    state = AuthState.unauthenticated();
  }
}


final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final apiService = ref.watch(authApiServiceProvider);
  final tokenStorage = ref.watch(tokenStorageProvider);
  return AuthNotifier(apiService, tokenStorage);
});
