import 'package:flutter_test/flutter_test.dart';
import 'package:user_app/features/friends/domain/entities/friend_model.dart';

void main() {
  group('Friends & Activity Sharing Tests', () {
    test('FriendModel can allow or hide activity and favorites based on permissions', () {
      final publicFriend = FriendModel(
        id: 'f-1',
        displayName: 'Abebe Bikila',
        email: 'abebe@example.com',
        isActivityAllowed: true,
        isFavoritesAllowed: true,
        activities: [
          FriendActivity(
            id: 'act-1',
            title: 'Verified Visit',
            subtitle: 'Checked in at Katenga Restaurant',
            time: '2 hours ago',
            type: 'visit',
            businessId: '1',
          ),
        ],
        favoritePlaces: [
          FriendPlace(
            id: '1',
            name: 'Katenga Restaurant',
            categoryName: 'Restaurant',
            landmarkDescription: 'Bole Road',
            rating: 4.8,
            reviewCount: 24,
          ),
        ],
      );

      expect(publicFriend.isActivityAllowed, isTrue);
      expect(publicFriend.isFavoritesAllowed, isTrue);
      expect(publicFriend.activities.length, 1);
      expect(publicFriend.favoritePlaces.length, 1);

      final privateFriend = FriendModel(
        id: 'f-2',
        displayName: 'Tigist Assefa',
        email: 'tigist@example.com',
        isActivityAllowed: false,
        isFavoritesAllowed: false,
      );

      expect(privateFriend.isActivityAllowed, isFalse);
      expect(privateFriend.isFavoritesAllowed, isFalse);
      expect(privateFriend.activities, isEmpty);
      expect(privateFriend.favoritePlaces, isEmpty);
    });
  });
}
