import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../business/presentation/screens/business_details_screen.dart';
import '../providers/discovery_provider.dart';
import '../widgets/nearby_business_card.dart';

class SavedPlacesScreen extends ConsumerWidget {
  final VoidCallback? onExploreTap;

  const SavedPlacesScreen({super.key, this.onExploreTap});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final savedPlacesAsync = ref.watch(savedPlacesDetailProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF7F7FB),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF7F7FB),
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text(
          'Saved Places',
          style: TextStyle(color: Color(0xFF172033), fontSize: 20, fontWeight: FontWeight.w800),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(savedPlacesDetailProvider);
        },
        child: savedPlacesAsync.when(
          data: (savedPlaces) {
            if (savedPlaces.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.bookmark_border_rounded, size: 72, color: Colors.grey.shade300),
                      const SizedBox(height: 14),
                      const Text(
                        'No saved places yet',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF172033)),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Save your favorite restaurants, cafés, and services\nto quickly access them anytime.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade600, height: 1.4),
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton.icon(
                        onPressed: onExploreTap,
                        icon: const Icon(Icons.explore_outlined, size: 18),
                        label: const Text(
                          'Explore Places',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF5547E8),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: savedPlaces.length,
              separatorBuilder: (_, _) => const SizedBox(height: 14),
              itemBuilder: (context, index) {
                final item = savedPlaces[index];
                return NearbyBusinessCard(
                  businessId: item.id,
                  name: item.name,
                  category: item.categoryName,
                  rating: item.rating.toStringAsFixed(1),
                  reviews: item.reviewCount.toString(),
                  location: item.locationDisplay,
                  distance: item.distanceDisplay,
                  imageUrl: item.imageUrl,
                  isFavorite: true,
                  onFavoriteTap: () {
                    ref.read(favoritesProvider.notifier).toggleFavorite(item.id);
                  },
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => BusinessDetailsScreen(businessId: item.id),
                      ),
                    );
                  },
                );
              },
            );
          },
          loading: () => const Center(
            child: CircularProgressIndicator(color: Color(0xFF5547E8)),
          ),
          error: (err, _) => Center(
            child: Text('Error loading saved places: $err'),
          ),
        ),
      ),
    );
  }
}
