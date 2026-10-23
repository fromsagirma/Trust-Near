import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import 'profile_provider.dart';

class DeleteAccountState {
  final bool isLoading;
  final String? errorMessage;
  final bool isDeleted;

  DeleteAccountState({
    this.isLoading = false,
    this.errorMessage,
    this.isDeleted = false,
  });

  DeleteAccountState copyWith({
    bool? isLoading,
    String? errorMessage,
    bool? isDeleted,
  }) {
    return DeleteAccountState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      isDeleted: isDeleted ?? this.isDeleted,
    );
  }
}

class DeleteAccountNotifier extends StateNotifier<DeleteAccountState> {
  final Ref ref;

  DeleteAccountNotifier(this.ref) : super(DeleteAccountState());

  Future<bool> deleteAccount() async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final repository = ref.read(profileRepositoryProvider);
      final success = await repository.deleteAccount();

      if (success) {
        state = state.copyWith(isLoading: false, isDeleted: true);
        // Clear secure storage token & reset auth state
        await ref.read(authProvider.notifier).logout();
        return true;
      } else {
        state = state.copyWith(
          isLoading: false,
          errorMessage: 'Account deletion failed on server',
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
      return false;
    }
  }
}

final deleteAccountProvider =
    StateNotifierProvider<DeleteAccountNotifier, DeleteAccountState>((ref) {
  return DeleteAccountNotifier(ref);
});
