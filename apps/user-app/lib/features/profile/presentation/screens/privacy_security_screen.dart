import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class PrivacySecurityScreen extends StatefulWidget {
  const PrivacySecurityScreen({super.key});

  @override
  State<PrivacySecurityScreen> createState() => _PrivacySecurityScreenState();
}

class _PrivacySecurityScreenState extends State<PrivacySecurityScreen> {
  String _placesVisibility = 'everyone';
  String _activitySharing = 'friends';
  String _profileDiscovery = 'everyone';
  bool _shareAnalytics = true;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _placesVisibility = prefs.getString('privacy_places_visibility') ?? 'everyone';
      _activitySharing = prefs.getString('privacy_activity_sharing') ?? 'friends';
      _profileDiscovery = prefs.getString('privacy_profile_discovery') ?? 'everyone';
      _shareAnalytics = prefs.getBool('privacy_analytics_sharing') ?? true;
      _isLoading = false;
    });
  }

  Future<void> _savePreference(String key, dynamic value) async {
    final prefs = await SharedPreferences.getInstance();
    if (value is String) {
      await prefs.setString(key, value);
    } else if (value is bool) {
      await prefs.setBool(key, value);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF7F8FC),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF172033)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Privacy & Security',
          style: TextStyle(
            color: Color(0xFF172033),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF5547E8)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Security Overview Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEEF0FF),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF5547E8).withValues(alpha: 0.2)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.lock_outline_rounded, color: Color(0xFF5547E8), size: 28),
                        SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Your Data is Protected',
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 14,
                                  color: Color(0xFF172033),
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'TrustNear uses industry-standard encryption for all your profile and location information.',
                                style: TextStyle(fontSize: 12, color: Color(0xFF6D7481)),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  const Text(
                    'VISIBILITY CONTROLS',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.1,
                      color: Color(0xFF7A8290),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Places Visibility
                  _buildSettingCard(
                    title: 'Who can see your saved places',
                    subtitle: 'Control who can view your bookmarks and recommendations',
                    icon: Icons.bookmark_outline_rounded,
                    selectedValue: _placesVisibility,
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _placesVisibility = val);
                        _savePreference('privacy_places_visibility', val);
                      }
                    },
                  ),

                  const SizedBox(height: 14),

                  // Shared Activity
                  _buildSettingCard(
                    title: 'Who can see your reviews & activity',
                    subtitle: 'Control public display of your submitted ratings and comments',
                    icon: Icons.rate_review_outlined,
                    selectedValue: _activitySharing,
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _activitySharing = val);
                        _savePreference('privacy_activity_sharing', val);
                      }
                    },
                  ),

                  const SizedBox(height: 14),

                  // Profile Discovery
                  _buildSettingCard(
                    title: 'Profile discovery',
                    subtitle: 'Allow other users in your area to discover your profile',
                    icon: Icons.person_search_outlined,
                    selectedValue: _profileDiscovery,
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _profileDiscovery = val);
                        _savePreference('privacy_profile_discovery', val);
                      }
                    },
                  ),

                  const SizedBox(height: 24),

                  const Text(
                    'SECURITY & PERMISSIONS',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.1,
                      color: Color(0xFF7A8290),
                    ),
                  ),
                  const SizedBox(height: 10),

                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        SwitchListTile(
                          title: const Text(
                            'Share anonymous app diagnostics',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                          subtitle: const Text(
                            'Helps improve app performance and stability',
                            style: TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                          value: _shareAnalytics,
                          activeThumbColor: const Color.fromARGB(255, 19, 7, 185),
                          onChanged: (val) {
                            setState(() => _shareAnalytics = val);
                            _savePreference('privacy_analytics_sharing', val);
                          },
                        ),
                        const Divider(height: 1),
                        ListTile(
                          leading: const Icon(Icons.vpn_key_outlined, color: Color(0xFF5547E8)),
                          title: const Text('Token Security', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                          subtitle: const Text('Encrypted in hardware Keystore / Keychain', style: TextStyle(fontSize: 12)),
                          trailing: const Icon(Icons.check_circle, color: Color(0xFF07945E), size: 18),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            ),
    );
  }

  Widget _buildSettingCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required String selectedValue,
    required ValueChanged<String?> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: const Color.fromARGB(255, 45, 191, 84), size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF172033)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            children: [
              _buildChoiceChip('Everyone', 'everyone', selectedValue, onChanged),
              _buildChoiceChip('Friends only', 'friends', selectedValue, onChanged),
              _buildChoiceChip('No one', 'no_one', selectedValue, onChanged),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildChoiceChip(
    String label,
    String value,
    String currentValue,
    ValueChanged<String?> onChanged,
  ) {
    final isSelected = value == currentValue;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: const Color.fromARGB(255, 245, 202, 86),
      backgroundColor: const Color(0xFFF3F4F6),
      labelStyle: TextStyle(
        color: isSelected ? const Color.fromARGB(255, 19, 2, 2) : const Color(0xFF334155),
        fontSize: 12,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
      onSelected: (selected) {
        if (selected) {
          onChanged(value);
        }
      },
    );
  }
}
