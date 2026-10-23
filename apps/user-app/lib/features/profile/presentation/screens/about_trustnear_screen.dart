import 'package:flutter/material.dart';
import '../../../auth/presentation/widgets/trustnear_logo.dart';

class AboutTrustNearScreen extends StatelessWidget {
  const AboutTrustNearScreen({super.key});

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
          'About TrustNear',
          style: TextStyle(
            color: Color(0xFF172033),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Branding Header
            Center(
              child: Column(
                children: [
                  const SizedBox(height: 10),
                  const TrustNearLogo(size: 52),
                  const SizedBox(height: 12),
                  const Text(
                    'TrustNear Mobile App',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF172033)),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEEF0FF),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'Version 1.0.0 (Production Build 2026)',
                      style: TextStyle(color: Color(0xFF5547E8), fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

            _buildSection(
              title: 'What is TrustNear?',
              content:
                  'TrustNear is a next-generation hyper-local discovery, verification, and community trust platform designed to seamlessly connect local consumers with reputable businesses in their immediate neighborhood.',
              icon: Icons.explore_rounded,
            ),

            const SizedBox(height: 16),

            _buildSection(
              title: 'What Problem Does It Solve?',
              content:
                  'In rapidly growing urban areas, navigating to local businesses can be difficult due to complex street layouts, inaccurate digital maps, and unverified reviews. TrustNear solves this by combining precise GPS coordinates, recognizable landmark descriptions, and community-verified ratings.',
              icon: Icons.lightbulb_outline_rounded,
            ),

            const SizedBox(height: 16),

            _buildSection(
              title: 'How Location is Used',
              content:
                  'Your location is detected exclusively on your device to calculate immediate walking distances and display relevant nearby services. Your real-time GPS coordinates are never broadcast publicly or sold to third parties.',
              icon: Icons.location_on_rounded,
            ),

            const SizedBox(height: 16),

            _buildSection(
              title: 'Privacy & Security',
              content:
                  'All sensitive credentials and authentication tokens are encrypted in hardware storage (Keystore/Keychain). Users maintain complete granular control over the visibility of their saved places and submitted reviews.',
              icon: Icons.security_rounded,
            ),

            const SizedBox(height: 16),

            _buildSection(
              title: 'The Role of Business Owners',
              content:
                  'Business owners can register and manage their listings, showcase photos, update operating hours, and reply directly to customer feedback through the dedicated TrustNear Web Portal.',
              icon: Icons.storefront_rounded,
            ),

            const SizedBox(height: 28),

            Center(
              child: Text(
                '© 2026 TrustNear Technologies. All rights reserved.',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildSection({
    required String title,
    required String content,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
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
              Container(
                width: 36,
                height: 36,
                decoration: const BoxDecoration(
                  color: Color(0xFFEEF0FF),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: const Color(0xFF5547E8), size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF172033)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            content,
            style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.5),
          ),
        ],
      ),
    );
  }
}
