import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/support_remote_data_source.dart';

final supportRemoteDataSourceProvider = Provider<SupportRemoteDataSource>((ref) {
  final apiClient = ApiClient(tokenStorage: ref.watch(tokenStorageProvider));
  return SupportRemoteDataSource(apiClient: apiClient);
});

class SupportTicketState {
  final bool isLoading;
  final String? errorMessage;
  final bool isSuccess;

  SupportTicketState({
    this.isLoading = false,
    this.errorMessage,
    this.isSuccess = false,
  });

  SupportTicketState copyWith({
    bool? isLoading,
    String? errorMessage,
    bool? isSuccess,
  }) {
    return SupportTicketState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      isSuccess: isSuccess ?? this.isSuccess,
    );
  }
}

class SupportTicketNotifier extends StateNotifier<SupportTicketState> {
  final Ref ref;

  SupportTicketNotifier(this.ref) : super(SupportTicketState());

  Future<bool> submitTicket(String message, {String? subject}) async {
    if (message.trim().isEmpty) {
      state = state.copyWith(errorMessage: 'Please describe your issue or feedback');
      return false;
    }

    state = state.copyWith(isLoading: true, errorMessage: null, isSuccess: false);
    try {
      final dataSource = ref.read(supportRemoteDataSourceProvider);
      final success = await dataSource.submitSupportTicket(message, subject: subject);

      state = state.copyWith(isLoading: false, isSuccess: success);
      return success;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }
}

final submitSupportTicketProvider =
    StateNotifierProvider<SupportTicketNotifier, SupportTicketState>((ref) {
  return SupportTicketNotifier(ref);
});
