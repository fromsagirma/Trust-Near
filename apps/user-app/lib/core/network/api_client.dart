import 'package:dio/dio.dart';
import '../storage/token_storage.dart';

class ApiClient {
  static const String liveRenderUrl = 'https://trust-near.onrender.com/api';

  static String get defaultBaseUrl {
    // 1. Explicit override passed via --dart-define=API_BASE_URL=...
    const envUrl = String.fromEnvironment('API_BASE_URL');
    if (envUrl.isNotEmpty) return envUrl;

    // 2. Default to the live Render cloud backend for physical mobile installations
    return liveRenderUrl;
  }

  static String baseUrl = defaultBaseUrl;

  final Dio dio;
  final TokenStorage tokenStorage;

  ApiClient({required this.tokenStorage, String? customBaseUrl})
      : dio = Dio(BaseOptions(
          baseUrl: customBaseUrl ?? baseUrl,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 15),
        )) {
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await tokenStorage.getAccessToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        options.headers['Content-Type'] = 'application/json';
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        if (e.response?.statusCode == 401 &&
            !e.requestOptions.path.contains('/auth/refresh') &&
            !e.requestOptions.path.contains('/auth/login')) {
          
          final refreshToken = await tokenStorage.getRefreshToken();
          if (refreshToken != null) {
            try {
              final refreshDio = Dio(BaseOptions(
                baseUrl: baseUrl,
                connectTimeout: const Duration(seconds: 20),
              ));
              final response = await refreshDio.post(
                '/auth/refresh',
                data: {'refreshToken': refreshToken},
              );

              if (response.statusCode == 200 && response.data['success'] == true) {
                final newAccess = response.data['data']['accessToken'];
                final newRefresh = response.data['data']['refreshToken'];
                await tokenStorage.saveTokens(
                  accessToken: newAccess,
                  refreshToken: newRefresh,
                );

                // Retry original request
                final opts = e.requestOptions;
                opts.headers['Authorization'] = 'Bearer $newAccess';
                final retryResponse = await refreshDio.fetch(opts);
                return handler.resolve(retryResponse);
              }
            } catch (_) {
              await tokenStorage.clearTokens();
            }
          }
        }
        return handler.next(e);
      }
    ));
  }
}


