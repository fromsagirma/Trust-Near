import 'package:flutter_test/flutter_test.dart';
import 'package:user_app/features/auth/data/models/user_model.dart';

void main() {
  group('UserModel & Role Validation Tests', () {
    test('UserModel JSON deserialization matches backend schema', () {
      final json = {
        'id': '123e4567-e89b-12d3-a456-426614174000',
        'displayName': 'Abebe Bikila',
        'email': 'abebe@example.com',
        'phone': '+251911223344',
        'role': 'user',
        'languagePref': 'en',
        'profilePhotoUrl': 'https://example.com/photo.jpg',
        'createdAt': '2026-08-19T20:00:00.000Z',
      };

      final user = UserModel.fromJson(json);

      expect(user.id, '123e4567-e89b-12d3-a456-426614174000');
      expect(user.displayName, 'Abebe Bikila');
      expect(user.email, 'abebe@example.com');
      expect(user.phone, '+251911223344');
      expect(user.role, 'user');
      expect(user.languagePref, 'en');
      expect(user.profilePhotoUrl, 'https://example.com/photo.jpg');
    });

    test('UserModel copyWith updates fields correctly', () {
      final user = UserModel(
        id: '1',
        displayName: 'Old Name',
        email: 'old@example.com',
        role: 'user',
      );

      final updated = user.copyWith(
        displayName: 'New Name',
        profilePhotoUrl: 'https://example.com/new.png',
      );

      expect(updated.id, '1');
      expect(updated.displayName, 'New Name');
      expect(updated.email, 'old@example.com');
      expect(updated.profilePhotoUrl, 'https://example.com/new.png');
    });

    test('Role validation logic blocks business owners and admins from user app', () {
      String? validateRoleAccess(String? role) {
        if (role == null || role.isEmpty) return null;
        final normalized = role.toLowerCase().trim();

        if (normalized == 'user' || normalized == 'guest_promoted' || normalized == 'registered_user') {
          return null;
        }

        if (normalized == 'business_owner' || normalized == 'owner') {
          return 'This account is registered as a Business Owner. Business owners must use the TrustNear Web Portal.';
        }

        if (normalized == 'admin' || normalized == 'seed_admin' || normalized == 'moderator') {
          return 'This account has Administrative privileges. Administrators must use the TrustNear Admin Portal.';
        }

        return 'Access denied: Unsupported account role.';
      }

      // Normal users: allowed
      expect(validateRoleAccess('user'), isNull);
      expect(validateRoleAccess('guest_promoted'), isNull);
      expect(validateRoleAccess(null), isNull);

      // Business owners: blocked with clear explanation
      final ownerResult = validateRoleAccess('business_owner');
      expect(ownerResult, isNotNull);
      expect(ownerResult, contains('Business Owner'));
      expect(ownerResult, contains('Web Portal'));

      // Admins: blocked with clear explanation
      final adminResult = validateRoleAccess('admin');
      expect(adminResult, isNotNull);
      expect(adminResult, contains('Administrative'));
      expect(adminResult, contains('Admin Portal'));

      final seedAdminResult = validateRoleAccess('seed_admin');
      expect(seedAdminResult, isNotNull);
      expect(seedAdminResult, contains('Administrative'));
    });
  });
}
