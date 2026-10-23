import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/location/location_provider.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../business/presentation/screens/business_details_screen.dart';
import '../../../activity/presentation/providers/activity_provider.dart';
import '../../../notifications/presentation/providers/notifications_provider.dart';
import '../../../notifications/presentation/screens/notifications_screen.dart';

import '../../../profile/presentation/screens/profile_screen.dart';

import '../providers/discovery_provider.dart';
import '../widgets/category_item.dart';
import '../widgets/nearby_business_card.dart';
import '../widgets/trust_card.dart';
import 'activity_screen.dart';
import 'explore_screen.dart';
import 'saved_places_screen.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  int _selectedIndex = 0;
  String? _selectedCategoryName;

  final List<Map<String, dynamic>> _categories = [
    {
      'id': 1,
      'name': 'Restaurants',
      'icon': Icons.restaurant,
      'color': const Color(0xFFFFF0B8),
    },
    {
      'id': 2,
      'name': 'Cafés',
      'icon': Icons.coffee,
      'color': const Color(0xFFFFE9F1),
    },
    {
      'id': 3,
      'name': 'Hotels',
      'icon': Icons.hotel,
      'color': const Color(0xFFE6F2FF),
    },
    {
      'id': 4,
      'name': 'Shopping',
      'icon': Icons.shopping_bag,
      'color': const Color(0xFFE5FAEF),
    },
    {
      'id': 5,
      'name': 'Healthcare',
      'icon': Icons.local_hospital,
      'color': const Color(0xFFF7E8FA),
    },
    {
      'id': 6,
      'name': 'Services',
      'icon': Icons.more_horiz,
      'color': const Color(0xFFEDEDF5),
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: IndexedStack(
          index: _selectedIndex,
          children: [
            _buildDashboard(),
            ExploreScreen(initialCategory: _selectedCategoryName),
            SavedPlacesScreen(
              onExploreTap: () => setState(() => _selectedIndex = 1),
            ),
            const ActivityScreen(),
            const ProfileScreen(),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNavigation(),
    );
  }

  Widget _buildDashboard() {
    final placesAsync = ref.watch(nearbyPlacesProvider);
    final recsAsync = ref.watch(recommendationsProvider);
    final promosAsync = ref.watch(activePromotionsProvider);
    final favList = ref.watch(favoritesProvider);
    final currentRadius = ref.watch(selectedRadiusProvider);
    final currentSort = ref.watch(selectedSortProvider);

    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          sliver: SliverToBoxAdapter(child: _buildHeader()),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          sliver: SliverToBoxAdapter(child: _buildSearch()),
        ),

        // Active Promotions / Featured Deals Banner
        promosAsync.when(
          data: (promos) {
            if (promos.isEmpty) {
              return const SliverToBoxAdapter(child: SizedBox.shrink());
            }
            return SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              sliver: SliverToBoxAdapter(
                child: SizedBox(
                  height: 120,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: promos.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 12),
                    itemBuilder: (context, idx) {
                      final promo = promos[idx];
                      return Container(
                        width: MediaQuery.of(context).size.width - 40,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [
                              Color.fromARGB(255, 14, 189, 224),
                              Color.fromARGB(255, 12, 212, 185),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(18),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(
                                0xFFE11D48,
                              ).withValues(alpha: 0.25),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(
                                        alpha: 0.2,
                                      ),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      'FEATURED PROMOTION',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 9,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    promo['title']?.toString() ??
                                        'Special Deal',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    promo['description']?.toString() ??
                                        'Limited time offer in your area',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: Color(0xFFFFE4E6),
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            if (promo['businessId'] != null)
                              ElevatedButton(
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => BusinessDetailsScreen(
                                        businessId: promo['businessId']
                                            .toString(),
                                      ),
                                    ),
                                  );
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white,
                                  foregroundColor: const Color(0xFFE11D48),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 8,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                                child: const Text(
                                  'View',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ),
            );
          },
          loading: () => const SliverToBoxAdapter(child: SizedBox.shrink()),
          error: (_, _) => const SliverToBoxAdapter(child: SizedBox.shrink()),
        ),

        const SliverPadding(
          padding: EdgeInsets.fromLTRB(20, 16, 20, 0),
          sliver: SliverToBoxAdapter(child: TrustCard()),
        ),

        // Explore Categories
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 24, 0, 0),
          sliver: SliverToBoxAdapter(
            child: _buildSectionHeader(
              'Explore categories',
              'See all',
              onActionTap: () {
                setState(() {
                  _selectedCategoryName = null;
                  _selectedIndex = 1;
                });
              },
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: SizedBox(
            height: 125,
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              itemCount: _categories.length,
              separatorBuilder: (context, index) => const SizedBox(width: 16),
              itemBuilder: (context, index) {
                final category = _categories[index];
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedCategoryName = category['name'] as String;
                      _selectedIndex = 1;
                    });
                  },
                  child: CategoryItem(
                    name: category['name'] as String,
                    icon: category['icon'] as IconData,
                    backgroundColor: category['color'] as Color,
                  ),
                );
              },
            ),
          ),
        ),

        // Recommended for You (UC-025 Personalized Recommendations)
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 12, 0, 0),
          sliver: SliverToBoxAdapter(
            child: _buildSectionHeader(
              'Recommended for you',
              'Explore',
              onActionTap: () => setState(() => _selectedIndex = 1),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: recsAsync.when(
            data: (recs) {
              if (recs.isEmpty) return const SizedBox.shrink();
              return SizedBox(
                height: 340,
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  itemCount: recs.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 14),
                  itemBuilder: (context, index) {
                    final item = recs[index];
                    final isFav = favList.contains(item.id);
                    return NearbyBusinessCard(
                      businessId: item.id,
                      name: item.name,
                      category: item.categoryName,
                      rating: item.rating.toStringAsFixed(1),
                      reviews: item.reviewCount.toString(),
                      location: item.locationDisplay,
                      distance: item.distanceDisplay,
                      imageUrl: item.imageUrl,
                      isFavorite: isFav,
                      onFavoriteTap: () {
                        ref
                            .read(favoritesProvider.notifier)
                            .toggleFavorite(item.id);
                      },
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) =>
                                BusinessDetailsScreen(businessId: item.id),
                          ),
                        );
                      },
                    );
                  },
                ),
              );
            },
            loading: () => const SizedBox(
              height: 100,
              child: Center(
                child: CircularProgressIndicator(color: Color(0xFF5547E8)),
              ),
            ),
            error: (_, _) => const SizedBox.shrink(),
          ),
        ),

        // Near You Section with Radius & Sort Filter Bar
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
          sliver: SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSectionHeader(
                  'Near you',
                  'See all',
                  onActionTap: () => setState(() => _selectedIndex = 1),
                ),
                // Radius & Sort row
                Row(
                  children: [
                    Text(
                      'Radius: ',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    for (final r in [2000, 5000, 15000, 30000]) ...[
                      ChoiceChip(
                        label: Text(
                          r >= 1000 ? '${r ~/ 1000} km' : '$r m',
                          style: const TextStyle(fontSize: 11),
                        ),
                        selected: currentRadius == r,
                        selectedColor: const Color.fromARGB(255, 11, 205, 89),
                        labelStyle: TextStyle(
                          color: currentRadius == r
                              ? Colors.white
                              : const Color(0xFF172033),
                          fontWeight: FontWeight.bold,
                        ),
                        onSelected: (_) {
                          ref.read(selectedRadiusProvider.notifier).state = r;
                        },
                      ),
                      const SizedBox(width: 6),
                    ],
                    const Spacer(),
                    GestureDetector(
                      onTap: () {
                        final nextSort = currentSort == 'distance'
                            ? 'rating'
                            : 'distance';
                        ref.read(selectedSortProvider.notifier).state =
                            nextSort;
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              currentSort == 'distance'
                                  ? Icons.near_me_rounded
                                  : Icons.star_rounded,
                              size: 14,
                              color: const Color.fromARGB(255, 91, 6, 34),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              currentSort == 'distance'
                                  ? 'Nearest'
                                  : 'Top Rated',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF172033),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: placesAsync.when(
            data: (places) {
              if (places.isEmpty) {
                return Container(
                  height: 120,
                  margin: const EdgeInsets.symmetric(horizontal: 20),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Center(
                    child: Text(
                      'No places found within this radius.',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  ),
                );
              }

              return SizedBox(
                height: 350,
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  itemCount: places.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(width: 16),
                  itemBuilder: (context, index) {
                    final place = places[index];
                    final isFav = favList.contains(place.id);

                    return NearbyBusinessCard(
                      businessId: place.id,
                      name: place.name,
                      category: place.categoryName,
                      rating: place.rating.toStringAsFixed(1),
                      reviews: place.reviewCount.toString(),
                      location: place.locationDisplay,
                      distance: place.distanceDisplay,
                      imageUrl: place.imageUrl,
                      isFavorite: isFav,
                      onFavoriteTap: () {
                        ref
                            .read(favoritesProvider.notifier)
                            .toggleFavorite(place.id);
                      },
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) =>
                                BusinessDetailsScreen(businessId: place.id),
                          ),
                        );
                      },
                    );
                  },
                ),
              );
            },
            loading: () => Container(
              height: 200,
              alignment: Alignment.center,
              child: const CircularProgressIndicator(color: Color(0xFF5547E8)),
            ),
            error: (err, stack) => Container(
              height: 100,
              margin: const EdgeInsets.symmetric(horizontal: 20),
              alignment: Alignment.center,
              child: Text('Error loading nearby places: $err'),
            ),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
          sliver: SliverToBoxAdapter(child: _buildRecentlyVisited()),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 20)),
      ],
    );
  }

  Future<void> _refreshAllDashboardData() async {
    ref.invalidate(userLocationProvider);
    ref.invalidate(nearbyPlacesProvider);
    ref.invalidate(recommendationsProvider);
    ref.invalidate(activePromotionsProvider);
    ref.invalidate(categoriesListProvider);
    ref.invalidate(unreadNotificationsCountProvider);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Dashboard refreshed with latest places & updates!'),
          backgroundColor: Color(0xFF07945E),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  Widget _buildHeader() {
    final locationAsync = ref.watch(userLocationProvider);
    final authState = ref.watch(authProvider);
    final currentRadius = ref.watch(selectedRadiusProvider);

    final hour = DateTime.now().hour;
    String timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good afternoon';
    } else if (hour >= 17 && hour < 22) {
      timeGreeting = 'Good evening';
    } else if (hour >= 22 || hour < 5) {
      timeGreeting = 'Good night';
    }

    String greeting = '$timeGreeting 👋';
    if (authState.status == AuthStatus.authenticated &&
        authState.user != null) {
      final name = authState.user!.displayName;
      if (name.isNotEmpty) {
        greeting = '$timeGreeting, ${name.split(' ').first} 👋';
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    greeting,
                    style: TextStyle(
                      fontSize: 18,
                      color: Colors.grey.shade600,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Find trusted places\nnear you',
                    style: TextStyle(
                      fontSize: 27,
                      height: 1.15,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF172033),
                    ),
                  ),
                ],
              ),
            ),
            // Header Refresh Button
            GestureDetector(
              onTap: _refreshAllDashboardData,
              child: Container(
                width: 48,
                height: 48,
                margin: const EdgeInsets.only(right: 10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.refresh_rounded,
                  color: Color.fromARGB(255, 10, 150, 40),
                  size: 22,
                ),
              ),
            ),
            // Notification Bell with Unread Badge
            Consumer(
              builder: (context, ref, child) {
                final unreadAsync = ref.watch(unreadNotificationsCountProvider);
                final unreadCount = unreadAsync.value ?? 0;

                return GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const NotificationsScreen(),
                      ),
                    );
                  },
                  child: Container(
                    width: 48,
                    height: 48,
                    margin: const EdgeInsets.only(right: 10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        const Icon(
                          Icons.notifications_outlined,
                          color: Color(0xFF172033),
                          size: 22,
                        ),
                        if (unreadCount > 0)
                          Positioned(
                            top: 8,
                            right: 8,
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(
                                color: Color(0xFFE11D48),
                                shape: BoxShape.circle,
                              ),
                              child: Text(
                                unreadCount > 9 ? '9+' : unreadCount.toString(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 8,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
            GestureDetector(
              onTap: () => setState(() => _selectedIndex = 4),
              child: Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: const Color(0xFF5547E8),
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF5547E8).withValues(alpha: 0.25),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                alignment: Alignment.center,
                child: Consumer(
                  builder: (context, ref, child) {
                    final user = authState.user;
                    if (user?.profilePhotoUrl != null &&
                        user!.profilePhotoUrl!.isNotEmpty) {
                      return ClipRRect(
                        borderRadius: BorderRadius.circular(18),
                        child: Image.network(
                          user.profilePhotoUrl!,
                          width: 56,
                          height: 56,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return const Icon(
                              Icons.person,
                              color: Colors.white,
                              size: 28,
                            );
                          },
                        ),
                      );
                    }

                    String initials = 'TN';
                    if (user != null && user.displayName.isNotEmpty) {
                      final parts = user.displayName.trim().split(
                        RegExp(r'\s+'),
                      );
                      if (parts.length > 1) {
                        initials = '${parts[0][0]}${parts[1][0]}'.toUpperCase();
                      } else {
                        initials = parts[0][0].toUpperCase();
                      }
                    }
                    return Text(
                      initials,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 17,
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            const Icon(
              Icons.location_on_outlined,
              color: Color.fromARGB(255, 32, 220, 76),
              size: 21,
            ),
            const SizedBox(width: 5),
            locationAsync.when(
              data: (loc) => Text(
                loc.locationName,
                style: const TextStyle(
                  color: Color(0xFF5547E8),
                  fontWeight: FontWeight.w700,
                  fontSize: 16,
                ),
              ),
              loading: () => const Text(
                'Detecting location...',
                style: TextStyle(
                  color: Color(0xFF5547E8),
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
              error: (_, _) => const Text(
                'Addis Ababa',
                style: TextStyle(
                  color: Color(0xFF5547E8),
                  fontWeight: FontWeight.w700,
                  fontSize: 16,
                ),
              ),
            ),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: () {
                ref.invalidate(userLocationProvider);
                ref.invalidate(nearbyPlacesProvider);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Updating location & nearby places...'),
                    duration: Duration(seconds: 1),
                  ),
                );
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 11,
                  vertical: 7,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE0E1E8)),
                ),
                child: Row(
                  children: [
                    Text(
                      'Refresh GPS',
                      style: TextStyle(
                        color: Colors.grey.shade700,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.refresh_rounded,
                      size: 15,
                      color: Colors.grey.shade600,
                    ),
                  ],
                ),
              ),
            ),
            const Spacer(),
            Text(
              '${currentRadius >= 1000 ? (currentRadius ~/ 1000) : currentRadius} km radius',
              style: TextStyle(
                color: Colors.grey.shade500,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSearch() {
    return GestureDetector(
      onTap: () => setState(() => _selectedIndex = 1),
      child: Row(
        children: [
          Expanded(
            child: Container(
              height: 58,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Icon(Icons.search, color: Colors.grey.shade500, size: 24),
                  const SizedBox(width: 12),
                  Text(
                    'Search businesses, places, landmarks...',
                    style: TextStyle(color: Colors.grey.shade400, fontSize: 14),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 12),
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: const Color.fromARGB(255, 6, 151, 90),
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(
              Icons.tune_rounded,
              color: Colors.white,
              size: 24,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(
    String title,
    String action, {
    VoidCallback? onActionTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(right: 20, bottom: 14),
      child: Row(
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Color(0xFF172033),
            ),
          ),
          const Spacer(),
          GestureDetector(
            onTap: onActionTap,
            child: Text(
              action,
              style: const TextStyle(
                color: Color(0xFF5547E8),
                fontSize: 14,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentlyVisited() {
    final activitiesAsync = ref.watch(userActivitiesProvider);

    return activitiesAsync.when(
      data: (activities) {
        final visitActivities = activities
            .where((a) => a.businessId != null)
            .take(3)
            .toList();
        if (visitActivities.isEmpty) {
          return const SizedBox.shrink();
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader(
              'Recently visited',
              'View all',
              onActionTap: () => setState(() => _selectedIndex = 3),
            ),
            for (final act in visitActivities) ...[
              _recentItem(
                id: act.businessId!,
                name: act.businessName ?? act.title,
                category: act.subtitle.isNotEmpty
                    ? act.subtitle
                    : 'Visited place',
                rating: '4.5',
                distance: act.time,
                imageUrl:
                    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
              ),
              const SizedBox(height: 12),
            ],
          ],
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
    );
  }

  Widget _recentItem({
    required String id,
    required String name,
    required String category,
    required String rating,
    required String distance,
    required String imageUrl,
  }) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => BusinessDetailsScreen(businessId: id),
          ),
        );
      },
      child: Container(
        height: 88,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(13),
              child: Image.network(
                imageUrl,
                width: 64,
                height: 64,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    width: 64,
                    height: 64,
                    color: Colors.grey.shade200,
                    child: const Icon(Icons.image_outlined),
                  );
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          name,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF172033),
                          ),
                        ),
                      ),
                      const SizedBox(width: 5),
                      const Icon(
                        Icons.verified_rounded,
                        size: 15,
                        color: Color(0xFF5547E8),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    category,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                  ),
                ],
              ),
            ),
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.star_rounded,
                      color: Color(0xFFFFA000),
                      size: 17,
                    ),
                    const SizedBox(width: 2),
                    Text(
                      rating,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  distance,
                  style: const TextStyle(
                    color: Color(0xFF5547E8),
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomNavigation() {
    const items = [
      (Icons.home_rounded, 'Home'),
      (Icons.explore_outlined, 'Explore'),
      (Icons.bookmark_border_rounded, 'Saved'),
      (Icons.show_chart_rounded, 'Activity'),
      (Icons.person_outline_rounded, 'Profile'),
    ];

    return Container(
      height: 80,
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: List.generate(items.length, (index) {
          final selected = _selectedIndex == index;

          return GestureDetector(
            onTap: () {
              setState(() {
                _selectedIndex = index;
              });
            },
            behavior: HitTestBehavior.opaque,
            child: SizedBox(
              width: 65,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    items[index].$1,
                    size: 24,
                    color: selected
                        ? const Color(0xFF5547E8)
                        : const Color(0xFF9EA4B2),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    items[index].$2,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                      color: selected
                          ? const Color(0xFF5547E8)
                          : const Color(0xFF9EA4B2),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }
}
