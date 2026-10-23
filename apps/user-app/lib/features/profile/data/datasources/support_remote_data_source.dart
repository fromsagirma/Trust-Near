import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';

class SupportRemoteDataSource {
  final ApiClient apiClient;

  SupportRemoteDataSource({required this.apiClient});

  Future<bool> submitSupportTicket(String message, {String? subject}) async {
    try {
      final response = await apiClient.dio.post(
        '/support/tickets',
        data: {
          'message': message,
          if (subject != null && subject.trim().isNotEmpty) 'subject': subject.trim(),
        },
      );

      return (response.statusCode == 200 || response.statusCode == 201) &&
          response.data['success'] == true;
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message ?? 'Failed to submit support ticket');
    } catch (_) {
      return false;
    }
  }
}
