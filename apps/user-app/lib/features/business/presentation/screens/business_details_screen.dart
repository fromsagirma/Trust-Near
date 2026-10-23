import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/utils/map_launcher.dart';
import '../../../discovery/presentation/providers/discovery_provider.dart';

import '../../domain/entities/business_detail.dart';
import '../providers/business_detail_provider.dart';
import '../widgets/photo_gallery.dart';
import '../widgets/landmark_display.dart';
import '../widgets/map_preview.dart';
import '../widgets/claim_business_dialog.dart';
import '../../../reviews/presentation/providers/business_reviews_provider.dart';
import '../../../reviews/presentation/widgets/review_card.dart';
import '../../../reviews/presentation/widgets/report_review_dialog.dart';
import '../../../reviews/presentation/screens/write_review_screen.dart';

class BusinessDetailsScreen extends ConsumerWidget {
  final String businessId;

  const BusinessDetailsScreen({super.key, required this.businessId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(businessDetailProvider(businessId));
    final favList = ref.watch(favoritesProvider);
    final isFav = favList.contains(businessId);

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FC),
      body: detailAsync.when(
        data: (business) {
          return CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 240,
                pinned: true,
                backgroundColor: const Color(0xFF172033),
                leading: Container(
                  margin: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.4),
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: const Icon(
                      Icons.arrow_back_ios_new_rounded,
                      color: Colors.white,
                      size: 18,
                    ),
                    onPressed: () => Navigator.pop(context),
                  ),
                ),
                actions: [
                  Container(
                    margin: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.4),
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: Icon(
                        isFav
                            ? Icons.favorite_rounded
                            : Icons.favorite_border_rounded,
                        color: isFav ? const Color(0xFFE11D48) : Colors.white,
                        size: 22,
                      ),
                      onPressed: () {
                        ref
                            .read(favoritesProvider.notifier)
                            .toggleFavorite(business.id);
                      },
                    ),
                  ),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: PhotoGallery(photoUrls: business.photoUrls),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header: Name & Rating Badge
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              business.name,
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF172033),
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEEF0FF),
                              borderRadius: BorderRadius.circular(15),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.star_rounded,
                                  color: Color(0xFFFFA000),
                                  size: 18,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  business.averageRating.toStringAsFixed(1),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF5547E8),
                                  ),
                                ),
                                Text(
                                  ' (${business.reviewCount})',
                                  style: TextStyle(
                                    color: Colors.grey.shade600,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        business.categoryName ?? 'Verified Business',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),

                      const SizedBox(height: 18),

                      // Action Buttons Row (Call, Directions, Share, Claim)
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () {
                                MapLauncher.launchCoordinates(
                                  context: context,
                                  latitude: business.latitude,
                                  longitude: business.longitude,
                                  businessName: business.name,
                                  fallbackAddress: business.landmarkDescription,
                                );
                              },
                              icon: const Icon(
                                Icons.directions_rounded,
                                size: 20,
                              ),
                              label: const Text(
                                'Directions',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color.fromARGB(
                                  255,
                                  71,
                                  194,
                                  232,
                                ),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  vertical: 14,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                            ),
                          ),
                          if (business.phone != null &&
                              business.phone!.isNotEmpty) ...[
                            const SizedBox(width: 10),
                            OutlinedButton.icon(
                              onPressed: () async {
                                final cleanPhone = business.phone!.replaceAll(
                                  RegExp(r'[^0-9+]'),
                                  '',
                                );
                                final phoneUri = Uri.parse('tel:$cleanPhone');
                                try {
                                  await launchUrl(
                                    phoneUri,
                                    mode: LaunchMode.externalApplication,
                                  );
                                } catch (_) {
                                  try {
                                    await launchUrl(phoneUri);
                                  } catch (e) {
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(
                                        context,
                                      ).showSnackBar(
                                        SnackBar(
                                          content: Text(
                                            'Phone: ${business.phone}',
                                          ),
                                        ),
                                      );
                                    }
                                  }
                                }
                              },
                              icon: const Icon(Icons.phone_rounded, size: 18),
                              label: Text(
                                'Call ${business.phone}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFF5547E8),
                                side: const BorderSide(
                                  color: Color(0xFF5547E8),
                                  width: 1.5,
                                ),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 14,
                                  horizontal: 14,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                            ),
                          ],

                          const SizedBox(width: 10),
                          OutlinedButton(
                            onPressed: () {
                              showDialog(
                                context: context,
                                builder: (_) => ClaimBusinessDialog(
                                  businessId: business.id,
                                  businessName: business.name,
                                ),
                              );
                            },
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF172033),
                              side: const BorderSide(color: Color(0xFFE2E8F0)),
                              padding: const EdgeInsets.symmetric(
                                vertical: 14,
                                horizontal: 12,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                            child: const Row(
                              children: [
                                Icon(
                                  Icons.verified_user_outlined,
                                  size: 16,
                                  color: Color(0xFF5547E8),
                                ),
                                SizedBox(width: 4),
                                Text(
                                  'Claim',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 14),

                      // GPS Check-in / Verify Visit Banner
                      InkWell(
                        onTap: () =>
                            _verifyLocationAtPlace(context, ref, business),
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 11,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEEF0FF),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: const Color(
                                0xFF5547E8,
                              ).withValues(alpha: 0.2),
                            ),
                          ),
                          child: const Row(
                            children: [
                              Icon(
                                Icons.pin_drop_rounded,
                                color: Color(0xFF5547E8),
                                size: 18,
                              ),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Are you currently here? Tap to GPS Verify Visit',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF5547E8),
                                  ),
                                ),
                              ),
                              Icon(
                                Icons.arrow_forward_ios_rounded,
                                size: 12,
                                color: Color(0xFF5547E8),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 22),

                      // Landmark
                      LandmarkDisplay(
                        landmarkDescription: business.landmarkDescription,
                      ),

                      const SizedBox(height: 20),

                      // About Section
                      if (business.description != null &&
                          business.description!.isNotEmpty) ...[
                        const Text(
                          'About',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF172033),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          business.description!,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade700,
                            height: 1.5,
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],

                      // Location & Google Maps
                      const Text(
                        'Location on Map',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF172033),
                        ),
                      ),
                      const SizedBox(height: 10),
                      MapPreview(
                        latitude: business.latitude,
                        longitude: business.longitude,
                        businessName: business.name,
                        landmarkDescription: business.landmarkDescription,
                      ),

                      const SizedBox(height: 26),

                      // Reviews & Ratings
                      Row(
                        children: [
                          const Text(
                            'Reviews & Ratings',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF172033),
                            ),
                          ),
                          const Spacer(),
                          TextButton.icon(
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (context) => WriteReviewScreen(
                                    businessId: businessId,
                                    businessName: business.name,
                                  ),
                                ),
                              );
                            },
                            icon: const Icon(
                              Icons.rate_review_outlined,
                              size: 18,
                              color: Color(0xFF5547E8),
                            ),
                            label: const Text(
                              'Write Review',
                              style: TextStyle(
                                color: Color(0xFF5547E8),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Consumer(
                        builder: (context, ref, child) {
                          final reviewsAsync = ref.watch(
                            businessReviewsProvider(businessId),
                          );
                          return reviewsAsync.when(
                            data: (reviews) {
                              if (reviews.isEmpty) {
                                return Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(20),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: Column(
                                    children: [
                                      Icon(
                                        Icons.star_outline_rounded,
                                        size: 36,
                                        color: Colors.grey.shade400,
                                      ),
                                      const SizedBox(height: 8),
                                      const Text(
                                        'No reviews yet',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Be the first to share your experience with this place!',
                                        style: TextStyle(
                                          color: Colors.grey.shade500,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }
                              return Column(
                                children: reviews
                                    .map(
                                      (r) => ReviewCard(
                                        review: r,
                                        onReport: () {
                                          showDialog(
                                            context: context,
                                            builder: (context) =>
                                                ReportReviewDialog(
                                                  reviewId: r.id,
                                                ),
                                          );
                                        },
                                      ),
                                    )
                                    .toList(),
                              );
                            },
                            loading: () => const Center(
                              child: CircularProgressIndicator(
                                color: Color(0xFF5547E8),
                              ),
                            ),
                            error: (e, _) => Text('Error loading reviews: $e'),
                          );
                        },
                      ),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
        loading: () => const Scaffold(
          body: Center(
            child: CircularProgressIndicator(color: Color(0xFF5547E8)),
          ),
        ),
        error: (err, stack) => Scaffold(
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded),
              onPressed: () => Navigator.pop(context),
            ),
            title: const Text('Place Details'),
          ),
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(err.toString(), textAlign: TextAlign.center),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () =>
                      ref.refresh(businessDetailProvider(businessId)),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _verifyLocationAtPlace(
    BuildContext context,
    WidgetRef ref,
    BusinessDetail business,
  ) async {
    final messenger = ScaffoldMessenger.of(context);

    // 1. Check if location services are enabled
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      messenger.showSnackBar(
        const SnackBar(
          content: Text(
            'Location services are disabled. Please enable GPS on your device.',
          ),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // 2. Check and request location permission
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text(
              'Location permission is required to verify your location.',
            ),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      messenger.showSnackBar(
        const SnackBar(
          content: Text(
            'Location permissions are permanently denied. Please enable them in app settings.',
          ),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // 3. Get current high accuracy device position
    Position position;
    try {
      position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );
    } catch (_) {
      try {
        final lastKnown = await Geolocator.getLastKnownPosition();
        if (lastKnown != null) {
          position = lastKnown;
        } else {
          throw Exception('Unable to determine device location');
        }
      } catch (e) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text(
              'Unable to determine device location. Please ensure GPS signal is available.',
            ),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }
    }

    // 4. Calculate actual geographic distance
    final distanceInMeters = Geolocator.distanceBetween(
      position.latitude,
      position.longitude,
      business.latitude,
      business.longitude,
    );

    // 5. 500m threshold enforcement
    if (distanceInMeters <= 500) {
      // Within 500 meters
      try {
        final repo = ref.read(businessRepositoryProvider);
        await repo.verifyVisit(
          businessId: business.id,
          latitude: position.latitude,
          longitude: position.longitude,
        );
      } catch (_) {}

      messenger.showSnackBar(
        SnackBar(
          content: Text(
            'You are currently at this location. (${distanceInMeters.toStringAsFixed(0)}m away)',
          ),
          backgroundColor: const Color(0xFF07945E),
          duration: const Duration(seconds: 4),
        ),
      );
    } else {
      // More than 500 meters
      final distStr = distanceInMeters >= 1000
          ? '${(distanceInMeters / 1000).toStringAsFixed(1)} km'
          : '${distanceInMeters.toStringAsFixed(0)} meters';

      messenger.showSnackBar(
        SnackBar(
          content: Text(
            'You are more than 500 meters away from this location. ($distStr away)',
          ),
          backgroundColor: const Color(0xFFE11D48),
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }
}
