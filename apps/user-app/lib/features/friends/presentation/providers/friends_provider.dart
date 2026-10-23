import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/friend_model.dart';

class FriendsState {
  final List<FriendModel> friends;
  final bool isLoading;
  final String? error;

  FriendsState({
    this.friends = const [],
    this.isLoading = false,
    this.error,
  });

  FriendsState copyWith({
    List<FriendModel>? friends,
    bool? isLoading,
    String? error,
  }) {
    return FriendsState(
      friends: friends ?? this.friends,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class FriendsNotifier extends StateNotifier<FriendsState> {
  FriendsNotifier() : super(FriendsState(friends: const []));

  void addFriend({
    required String name,
    required String emailOrPhone,
  }) {
    final newFriend = FriendModel(
      id: 'f-${DateTime.now().millisecondsSinceEpoch}',
      displayName: name,
      email: emailOrPhone.contains('@') ? emailOrPhone : '${name.toLowerCase().replaceAll(' ', '.')}@example.com',
      phone: emailOrPhone.contains('@') ? null : emailOrPhone,
      status: 'connected',
      connectedSince: DateTime.now(),
      isActivityAllowed: true,
      isFavoritesAllowed: true,
      activities: [
        FriendActivity(
          id: 'act-${DateTime.now().millisecondsSinceEpoch}',
          title: 'Connected on TrustNear',
          subtitle: 'Became friends recently',
          time: 'Just now',
          type: 'connection',
        ),
      ],
      favoritePlaces: [],
    );

    state = state.copyWith(
      friends: [newFriend, ...state.friends],
    );
  }

  void removeFriend(String friendId) {
    state = state.copyWith(
      friends: state.friends.where((f) => f.id != friendId).toList(),
    );
  }

  FriendModel? getFriendById(String friendId) {
    try {
      return state.friends.firstWhere((f) => f.id == friendId);
    } catch (_) {
      return null;
    }
  }
}

final friendsProvider = StateNotifierProvider<FriendsNotifier, FriendsState>((ref) {
  return FriendsNotifier();
});
