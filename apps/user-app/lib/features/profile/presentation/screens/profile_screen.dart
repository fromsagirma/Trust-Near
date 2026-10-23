import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../business/presentation/screens/owner_dashboard_screen.dart';
import '../../../discovery/presentation/providers/discovery_provider.dart';
import '../../../activity/presentation/providers/activity_provider.dart';
import '../../data/models/location_settings_model.dart';
import '../../data/models/notification_settings_model.dart';
import '../../../friends/presentation/screens/friends_screen.dart';
import '../../../friends/presentation/providers/friends_provider.dart';

import '../../domain/entities/user_profile_detail.dart';

import '../providers/profile_provider.dart';
import '../providers/support_provider.dart';
import '../widgets/delete_account_dialog.dart';
import '../widgets/profile_stat_card.dart';
import 'about_trustnear_screen.dart';
import 'edit_profile_screen.dart';
import 'help_center_screen.dart';
import 'privacy_security_screen.dart';

import '../../../../main.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  void _editProfile(UserProfileDetail profile) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => EditProfileScreen(profile: profile)),
    );
  }

  void _navigateToBecomeBusinessOwner() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const OwnerDashboardScreen()),
    );
  }

  void _showLanguageModal(String currentLang) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        final languages = [
          {'code': 'en', 'name': 'English', 'native': 'English (Default)'},
          {'code': 'am', 'name': 'Amharic', 'native': 'አማርኛ (Amharic)'},
          {'code': 'om', 'name': 'Afaan Oromoo', 'native': 'Afaan Oromoo (Oromo)'},
        ];

        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Language / ቋንቋ',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF172033),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              for (final lang in languages) ...[
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: currentLang == lang['code']
                          ? const Color(0xFF5547E8)
                          : const Color(0xFFEEF0FF),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        (lang['code'] as String).toUpperCase(),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: currentLang == lang['code'] ? Colors.white : const Color(0xFF5547E8),
                        ),
                      ),
                    ),
                  ),
                  title: Text(
                    lang['native'] as String,
                    style: TextStyle(
                      fontWeight: currentLang == lang['code'] ? FontWeight.bold : FontWeight.w500,
                      color: const Color(0xFF172033),
                    ),
                  ),
                  trailing: currentLang == lang['code']
                      ? const Icon(Icons.check_circle_rounded, color: Color(0xFF5547E8))
                      : null,
                  onTap: () async {
                    Navigator.pop(context);
                    try {
                      final repo = ref.read(profileRepositoryProvider);
                      await repo.updateProfile(languagePref: lang['code']);
                      ref.invalidate(profileProvider);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Language switched to ${lang['name']}!'),
                            backgroundColor: const Color(0xFF07945E),
                          ),
                        );
                      }
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Language updated: ${lang['name']}'), backgroundColor: const Color(0xFF5547E8)),
                        );
                      }
                    }
                  },
                ),
                const Divider(height: 1),
              ],
              const SizedBox(height: 10),
            ],
          ),
        );
      },
    );
  }

  void _showNotificationsModal() {
    final currentSettings = ref.read(notificationSettingsProvider).value;
    bool pushEnabled = currentSettings?.pushNotificationsEnabled ?? true;
    bool emailEnabled = currentSettings?.emailUpdatesEnabled ?? true;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Notification Settings',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF172033)),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SwitchListTile(
                    title: const Text('Push Notifications', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    subtitle: const Text('Alerts for nearby places, deals & promotions', style: TextStyle(fontSize: 12)),
                    value: pushEnabled,
                    activeThumbColor: const Color(0xFF5547E8),
                    onChanged: (val) => setModalState(() => pushEnabled = val),
                  ),
                  SwitchListTile(
                    title: const Text('Email Digest', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    subtitle: const Text('Weekly summary of trending places in your city', style: TextStyle(fontSize: 12)),
                    value: emailEnabled,
                    activeThumbColor: const Color(0xFF5547E8),
                    onChanged: (val) => setModalState(() => emailEnabled = val),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: () async {
                        final messenger = ScaffoldMessenger.of(context);
                        Navigator.pop(sheetContext);
                        final success = await ref.read(editProfileProvider.notifier).updateNotificationSettings(
                              NotificationSettingsModel(
                                pushNotificationsEnabled: pushEnabled,
                                emailUpdatesEnabled: emailEnabled,
                              ),
                            );
                        if (mounted) {
                          messenger.showSnackBar(
                            SnackBar(
                              content: Text(success ? 'Notification preferences saved!' : 'Failed to save preferences'),
                              backgroundColor: success ? Colors.green : Colors.red,
                            ),
                          );
                        }
                      },

                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color.fromARGB(255, 25, 131, 188),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text('Save Preferences', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showLocationModal() {
    final currentSettings = ref.read(locationSettingsProvider).value;
    String selectedCity = currentSettings?.city ?? 'Addis Ababa';
    double radius = currentSettings?.radiusKm ?? 2.4;

    showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: const Row(
                children: [
                  Icon(Icons.location_on_outlined, color: Color(0xFF5547E8)),
                  SizedBox(width: 8),
                  Text('Location Settings'),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Default Search City:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    initialValue: selectedCity,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    items: ['Addis Ababa', 'Hawassa', 'Bishoftu', 'Adama', 'Dire Dawa', 'Bahir Dar']
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) setModalState(() => selectedCity = val);
                    },
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Search Radius:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      Text('${radius.toStringAsFixed(1)} km', style: const TextStyle(color: Color(0xFF5547E8), fontWeight: FontWeight.bold)),
                    ],
                  ),
                  Slider(
                    value: radius,
                    min: 0.5,
                    max: 20.0,
                    divisions: 39,
                    activeColor: const Color(0xFF5547E8),
                    label: '${radius.toStringAsFixed(1)} km',
                    onChanged: (val) => setModalState(() => radius = val),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final messenger = ScaffoldMessenger.of(context);
                    Navigator.pop(dialogContext);
                    final success = await ref.read(editProfileProvider.notifier).updateLocationSettings(
                          LocationSettingsModel(
                            city: selectedCity,
                            lat: 9.03,
                            lng: 38.74,
                            radiusKm: radius,
                          ),
                        );
                    if (mounted) {
                      messenger.showSnackBar(
                        SnackBar(
                          content: Text(success ? 'Location settings saved!' : 'Failed to save location settings'),
                          backgroundColor: success ? Colors.green : Colors.red,
                        ),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: const Color.fromARGB(255, 15, 175, 146), foregroundColor: Colors.white),
                  child: const Text('Save Settings'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showContactSupportModal() {
    final messageController = TextEditingController();
    String category = 'General Inquiry';

    showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: const Row(
                children: [
                  Icon(Icons.support_agent_rounded, color: Color(0xFF5547E8)),
                  SizedBox(width: 8),
                  Text('Contact Support', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Category', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey)),
                  const SizedBox(height: 4),
                  DropdownButtonFormField<String>(
                    initialValue: category,
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    items: ['General Inquiry', 'Business Listing Issue', 'Report Content', 'Account Question']
                        .map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 13))))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) setDialogState(() => category = val);
                    },
                  ),
                  const SizedBox(height: 12),
                  const Text('Your Message', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey)),
                  const SizedBox(height: 4),
                  TextField(
                    controller: messageController,
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText: 'Describe your issue or feedback in detail...',
                      hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final messenger = ScaffoldMessenger.of(context);
                    final msg = messageController.text.trim();
                    if (msg.isEmpty) {
                      messenger.showSnackBar(
                        const SnackBar(content: Text('Please enter a message'), backgroundColor: Colors.red),
                      );
                      return;
                    }
                    Navigator.pop(dialogContext);
                    final success = await ref.read(submitSupportTicketProvider.notifier).submitTicket(msg);
                    if (mounted) {
                      messenger.showSnackBar(
                        SnackBar(
                          content: Text(success ? 'Support ticket submitted successfully!' : 'Failed to submit ticket'),
                          backgroundColor: success ? const Color(0xFF07945E) : Colors.red,
                        ),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color.fromARGB(255, 117, 171, 16),
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Submit Ticket'),
                ),
              ],
            );
          },
        );
      },
    );
  }



  void _showDeleteAccountDialog() {
    showDialog(
      context: context,
      builder: (_) => const DeleteAccountDialog(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    if (authState.status == AuthStatus.unauthenticated) {
      return const Scaffold(
        body: Center(child: Text('Please log in to view profile')),
      );
    }

    final profileAsync = ref.watch(profileProvider);
    final favorites = ref.watch(favoritesProvider);

    ref.listen<AuthState>(authProvider, (previous, next) {
      if (next.status == AuthStatus.unauthenticated) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const AuthChecker()),
          (route) => false,
        );
      }
    });

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF7F8FC),
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Row(
          children: [
            Icon(
              Icons.person_outline_rounded,
              size: 20,
              color: Color(0xFF5547E8),
            ),
            SizedBox(width: 8),
            Text(
              'Profile',
              style: TextStyle(
                color: Color(0xFF172033),
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
      body: profileAsync.when(
        data: (profile) {
          return SingleChildScrollView(
            child: Column(
              children: [
                _buildProfileHeader(profile),
                const SizedBox(height: 14),
                _buildActivitySection(favoritesCount: favorites.length),
                const SizedBox(height: 16),
                _buildBusinessOwnerBanner(profile),
                const SizedBox(height: 16),
                _buildAccountSection(profile),
                const SizedBox(height: 16),
                _buildSupportSection(),
                const SizedBox(height: 16),
                _buildLogoutButton(),

                const SizedBox(height: 10),
                const Text(
                  'TrustNear App Version 2.0.3 (Build 2026)',
                  style: TextStyle(fontSize: 11, color: Color(0xFF858B96)),
                ),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
        loading: () => const Center(
          child: Padding(
            padding: EdgeInsets.all(40.0),
            child: CircularProgressIndicator(color: Color(0xFF5547E8)),
          ),
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Error loading profile: $e'),
              const SizedBox(height: 10),
              ElevatedButton(
                onPressed: () => ref.refresh(profileProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProfileHeader(UserProfileDetail profile) {
    final initials = profile.displayName.isNotEmpty

        ? profile.displayName.substring(0, 1).toUpperCase()
        : 'U';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
      decoration: const BoxDecoration(
        color: Color(0xFFEEF0FF),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: Column(
        children: [
          GestureDetector(
            onTap: () => _editProfile(profile),
            child: Stack(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color.fromARGB(255, 74, 187, 26),
                    border: Border.all(color: Colors.white, width: 3),
                  ),
                  child: ClipOval(
                    child: (profile.profilePhotoUrl != null && profile.profilePhotoUrl!.isNotEmpty)
                        ? Image.network(
                            profile.profilePhotoUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => Center(
                              child: Text(
                                initials,
                                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ),
                          )
                        : Center(
                            child: Text(
                              initials,
                              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                          ),
                  ),
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Color(0xFF071B3A),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.edit, size: 14, color: Colors.white),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Text(
            profile.displayName,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Color(0xFF172033),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            profile.email,
            style: const TextStyle(fontSize: 13, color: Color(0xFF6D7481)),
          ),
          if (profile.phone != null && profile.phone!.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              profile.phone!,
              style: const TextStyle(fontSize: 12, color: Color(0xFF5547E8), fontWeight: FontWeight.w600),
            ),
          ],
          const SizedBox(height: 14),
          SizedBox(
            height: 38,
            child: ElevatedButton.icon(
              onPressed: () => _editProfile(profile),
              icon: const Icon(Icons.edit_rounded, size: 14),
              label: const Text(
                'Edit Profile',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color.fromARGB(255, 27, 116, 124),
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 18),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActivitySection({required int favoritesCount}) {
    final statsAsync = ref.watch(userActivityStatsProvider);

    final savedCount = statsAsync.when(
      data: (s) => s.savedPlaces.toString(),
      loading: () => '$favoritesCount',
      error: (_, _) => '$favoritesCount',
    );

    final reviewsCount = statsAsync.when(
      data: (s) => s.reviews.toString(),
      loading: () => '...',
      error: (_, _) => '0',
    );

    final visitedCount = statsAsync.when(
      data: (s) => s.recentlyVisited.toString(),
      loading: () => '...',
      error: (_, _) => '0',
    );

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 15),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'My Activity',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Color(0xFF172033),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              ProfileStatCard(
                icon: Icons.bookmark_rounded,
                value: savedCount,
                label: 'Saved\nPlaces',
                iconColor: Colors.white,
                iconBackground: const Color(0xFF5547E8),
              ),
              const SizedBox(width: 8),
              ProfileStatCard(
                icon: Icons.star_rounded,
                value: reviewsCount,
                label: 'My\nReviews',
                iconColor: const Color(0xFF176C39),
                iconBackground: const Color(0xFF66E990),
              ),
              const SizedBox(width: 8),
              ProfileStatCard(
                icon: Icons.history_rounded,
                value: visitedCount,
                label: 'Recently\nVisited',
                iconColor: Colors.white,
                iconBackground: const Color(0xFF59616F),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBusinessOwnerBanner(UserProfileDetail profile) {
    final isOwner = profile.role == 'business_owner' || profile.role == 'admin' || profile.role == 'seed_admin';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 15),
      child: InkWell(

        onTap: _navigateToBecomeBusinessOwner,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color.fromARGB(255, 18, 6, 179), Color.fromARGB(255, 82, 20, 123)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF5547E8).withValues(alpha: 0.3),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.storefront_rounded, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isOwner ? 'Business Owner Dashboard' : 'Become a Business Owner',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isOwner
                          ? 'Manage your listings, photos, reviews & promotions'
                          : 'List and grow your local business on TrustNear',
                      style: const TextStyle(
                        color: Color(0xFFD9DDF7),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAccountSection(UserProfileDetail profile) {
    String langName = 'English';
    if (profile.languagePref == 'am') {
      langName = 'አማርኛ (Amharic)';
    } else if (profile.languagePref == 'om') {
      langName = 'Afaan Oromoo';
    }

    return _buildSection(
      title: 'ACCOUNT SETTINGS',
      children: [
        Consumer(
          builder: (context, ref, child) {
            final friendsCount = ref.watch(friendsProvider).friends.length;
            return _buildMenuItem(
              icon: Icons.people_alt_rounded,
              title: 'Friends & Connections ($friendsCount)',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const FriendsScreen()),
                );
              },
            );
          },
        ),
        _buildMenuItem(
          icon: Icons.language_rounded,
          title: 'Language: $langName',
          onTap: () => _showLanguageModal(profile.languagePref),
        ),
        _buildMenuItem(
          icon: Icons.notifications_none_rounded,
          title: 'Notifications',
          onTap: _showNotificationsModal,
        ),
        _buildMenuItem(
          icon: Icons.security_outlined,
          title: 'Privacy & Security',
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const PrivacySecurityScreen()),
            );
          },
        ),
        _buildMenuItem(
          icon: Icons.location_on_outlined,
          title: 'Location Settings',
          onTap: _showLocationModal,
        ),
        _buildMenuItem(
          icon: Icons.delete_forever_rounded,
          title: 'Delete Account',
          isDestructive: true,
          onTap: _showDeleteAccountDialog,
        ),
      ],

    );
  }


  Widget _buildSupportSection() {
    return _buildSection(
      title: 'HELP & SUPPORT',
      children: [
        _buildMenuItem(
          icon: Icons.help_outline_rounded,
          title: 'Help Center',
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const HelpCenterScreen()),
            );
          },
        ),
        _buildMenuItem(
          icon: Icons.support_agent_rounded,
          title: 'Contact Support',
          onTap: _showContactSupportModal,
        ),
        _buildMenuItem(
          icon: Icons.info_outline_rounded,
          title: 'About TrustNear',
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const AboutTrustNearScreen()),
            );
          },
        ),
      ],
    );
  }

  Widget _buildSection({
    required String title,
    required List<Widget> children,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 15),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 6, bottom: 7),
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 10,
                letterSpacing: 1.1,
                fontWeight: FontWeight.bold,
                color: Color(0xFF7A8290),
              ),
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(children: children),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    final iconBgColor = isDestructive ? const Color(0xFFFFEBEB) : const Color(0xFFEEF0FF);
    final iconColor = isDestructive ? const Color(0xFFD93030) : const Color(0xFF5547E8);
    final textColor = isDestructive ? const Color(0xFFD93030) : const Color(0xFF273142);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: iconBgColor,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 16, color: iconColor),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 13,
                  color: textColor,
                  fontWeight: isDestructive ? FontWeight.bold : FontWeight.w500,
                ),
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: isDestructive ? const Color(0xFFD93030) : const Color(0xFF7C8490),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLogoutButton() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 15),
      child: SizedBox(
        width: double.infinity,
        height: 48,
        child: TextButton.icon(
          onPressed: _showLogoutDialog,
          icon: const Icon(
            Icons.logout_rounded,
            size: 18,
            color: Color(0xFFD93030),
          ),
          label: const Text(
            'Log Out',
            style: TextStyle(fontSize: 14, color: Color(0xFFD93030), fontWeight: FontWeight.bold),
          ),
          style: TextButton.styleFrom(
            backgroundColor: const Color(0xFFFFF4F4),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ),
    );
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Log Out', style: TextStyle(fontWeight: FontWeight.bold)),
          content: const Text('Are you sure you want to log out from TrustNear?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                ref.read(authProvider.notifier).logout();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD93030),
                foregroundColor: Colors.white,
              ),
              child: const Text('Log Out'),
            ),
          ],
        );
      },
    );
  }
}
