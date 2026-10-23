import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../widgets/trustnear_logo.dart';
import 'welcome_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _controller = PageController();
  int _currentPage = 0;

  final List<_OnboardingData> pages = const [
    _OnboardingData(
      title: 'Find places\nnear you',
      subtitle: 'HYPER-LOCAL DISCOVERY',
      description:
          'Instantly discover verified businesses, restaurants, cafés, and local services within walking distance.\nReal places, real proximity.',
      backgroundColor: Color(0xFFE8F5E9),
      accentColor: Color(0xFF07945E),
      type: _IllustrationType.hyperlocal,
    ),
    _OnboardingData(
      title: 'Know who\nto trust',
      subtitle: 'VERIFIED REPUTATION',
      description:
          'Every listing is backed by honest community reviews, verified visit badges, and transparent star ratings.\nTrust is built in.',
      backgroundColor: Color(0xFFEFF2FF),
      accentColor: Color(0xFF4F46E5),
      type: _IllustrationType.ratings,
    ),
    _OnboardingData(
      title: 'Accurate maps &\ndirections',
      subtitle: 'LANDMARK NAVIGATION',
      description:
          'Never get lost with accurate landmark descriptions, exact GPS coordinates, and direct Google Maps navigation right to their doorstep.',
      backgroundColor: Color(0xFFFFF9E6),
      accentColor: Color(0xFFD97706),
      type: _IllustrationType.maps,
    ),
    _OnboardingData(
      title: 'Your trusted\nplaces start here',
      subtitle: 'CONNECTED NEIGHBORHOOD',
      description:
          'Save your favorite spots, share your recommendations, and connect with your vibrant local community with confidence.',
      backgroundColor: Color(0xFFF3E8FF),
      accentColor: Color(0xFF7C3AED),
      type: _IllustrationType.community,
    ),
  ];

  void _next() {
    if (_currentPage == pages.length - 1) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const WelcomeScreen()),
      );
      return;
    }

    _controller.nextPage(
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeInOutCubic,
    );
  }

  void _skip() {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const WelcomeScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currentThemeColor = pages[_currentPage].accentColor;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Top App Bar with Logo & Skip
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TrustNearLogo(
                    size: 32,
                    primaryColor: _currentPage == 0
                        ? const Color(0xFF07945E)
                        : const Color(0xFF4F46E5),
                  ),
                  TextButton(
                    onPressed: _skip,
                    style: TextButton.styleFrom(
                      backgroundColor: const Color(0xFFF5F5F7),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 8,
                      ),
                      shape: const StadiumBorder(),
                    ),
                    child: Text(
                      'Skip',
                      style: GoogleFonts.plusJakartaSans(
                        color: const Color(0xFF64748B),
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Scrollable / Swipeable 4 Page View
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: pages.length,
                onPageChanged: (index) {
                  setState(() => _currentPage = index);
                },
                itemBuilder: (_, index) {
                  final page = pages[index];

                  return SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 12),

                        // Visual Illustration Card
                        _IllustrationCard(
                          pageIndex: index,
                          backgroundColor: page.backgroundColor,
                          accentColor: page.accentColor,
                          type: page.type,
                        ),

                        const SizedBox(height: 28),

                        // Category Tag
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: page.accentColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            page.subtitle,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: page.accentColor,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ),

                        const SizedBox(height: 12),

                        Text(
                          page.title,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 32,
                            height: 1.15,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF071B3A),
                          ),
                        ),

                        const SizedBox(height: 14),

                        Text(
                          page.description,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 15,
                            height: 1.6,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

            // Bottom Navigation Controls
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(pages.length, (index) {
                      final selected = index == _currentPage;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: selected ? 32 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: selected
                              ? currentThemeColor
                              : const Color(0xFFE2E5EA),
                          borderRadius: BorderRadius.circular(10),
                        ),
                      );
                    }),
                  ),

                  const SizedBox(height: 20),

                  SizedBox(
                    width: double.infinity,
                    height: 58,
                    child: ElevatedButton(
                      onPressed: _next,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: currentThemeColor,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(18),
                        ),
                      ),
                      child: Text(
                        _currentPage == pages.length - 1
                            ? 'Get Started'
                            : 'Next',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OnboardingData {
  final String title;
  final String subtitle;
  final String description;
  final Color backgroundColor;
  final Color accentColor;
  final _IllustrationType type;

  const _OnboardingData({
    required this.title,
    required this.subtitle,
    required this.description,
    required this.backgroundColor,
    required this.accentColor,
    required this.type,
  });
}

enum _IllustrationType { hyperlocal, ratings, maps, community }

class _IllustrationCard extends StatelessWidget {
  final int pageIndex;
  final Color backgroundColor;
  final Color accentColor;
  final _IllustrationType type;

  const _IllustrationCard({
    required this.pageIndex,
    required this.backgroundColor,
    required this.accentColor,
    required this.type,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 260,
      width: double.infinity,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: accentColor.withValues(alpha: 0.15),
          width: 1.5,
        ),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background concentric decorative rings
          Positioned(
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: accentColor.withValues(alpha: 0.08),
                  width: 32,
                ),
              ),
            ),
          ),
          Positioned(
            child: Container(
              width: 130,
              height: 130,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: accentColor.withValues(alpha: 0.12),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Center(child: _buildCenterIcon()),
            ),
          ),
          // Floating badge elements
          if (type == _IllustrationType.hyperlocal) ...[
            Positioned(
              top: 24,
              right: 24,
              child: _buildFloatBadge(
                icon: Icons.directions_walk_rounded,
                label: '0.3 km away',
                color: const Color(0xFF07945E),
              ),
            ),
            Positioned(
              bottom: 24,
              left: 24,
              child: _buildFloatBadge(
                icon: Icons.check_circle_rounded,
                label: 'Verified Place',
                color: const Color(0xFF07945E),
              ),
            ),
          ] else if (type == _IllustrationType.ratings) ...[
            Positioned(
              top: 24,
              left: 24,
              child: _buildFloatBadge(
                icon: Icons.star_rounded,
                label: '4.9 ★ (300+)',
                color: const Color(0xFF4F46E5),
              ),
            ),
            Positioned(
              bottom: 24,
              right: 24,
              child: _buildFloatBadge(
                icon: Icons.verified_user_rounded,
                label: 'Trusted Reviews',
                color: const Color(0xFF4F46E5),
              ),
            ),
          ] else if (type == _IllustrationType.maps) ...[
            Positioned(
              top: 24,
              right: 24,
              child: _buildFloatBadge(
                icon: Icons.near_me_rounded,
                label: 'Precise GPS',
                color: const Color(0xFFD97706),
              ),
            ),
            Positioned(
              bottom: 24,
              left: 24,
              child: _buildFloatBadge(
                icon: Icons.map_rounded,
                label: 'Google Maps Ready',
                color: const Color(0xFFD97706),
              ),
            ),
          ] else ...[
            Positioned(
              top: 24,
              left: 24,
              child: _buildFloatBadge(
                icon: Icons.bookmark_rounded,
                label: 'Saved Places',
                color: const Color(0xFF7C3AED),
              ),
            ),
            Positioned(
              bottom: 24,
              right: 24,
              child: _buildFloatBadge(
                icon: Icons.storefront_rounded,
                label: 'Local Community',
                color: const Color(0xFF7C3AED),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCenterIcon() {
    switch (type) {
      case _IllustrationType.hyperlocal:
        // First onboarding screen has the TrustNear logo in GREEN
        return const TrustNearLogo(
          size: 72,
          showText: false,
          primaryColor: Color(0xFF07945E),
        );
      case _IllustrationType.ratings:
        return const Icon(
          Icons.verified_rounded,
          size: 64,
          color: Color(0xFF4F46E5),
        );
      case _IllustrationType.maps:
        return const Icon(
          Icons.location_on_rounded,
          size: 64,
          color: Color(0xFFD97706),
        );
      case _IllustrationType.community:
        return const Icon(
          Icons.favorite_rounded,
          size: 64,
          color: Color(0xFF7C3AED),
        );
    }
  }

  Widget _buildFloatBadge({
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF172033),
            ),
          ),
        ],
      ),
    );
  }
}
