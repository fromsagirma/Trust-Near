import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../activity/presentation/providers/activity_provider.dart';
import '../../../business/presentation/screens/business_details_screen.dart';

class ActivityScreen extends ConsumerWidget {
  const ActivityScreen({super.key});

  IconData _getIconData(String iconName) {
    switch (iconName) {
      case 'star_rounded':
        return Icons.star_rounded;
      case 'location_on_rounded':
        return Icons.location_on_rounded;
      case 'bookmark_rounded':
        return Icons.bookmark_rounded;
      case 'bookmark_border_rounded':
        return Icons.bookmark_border_rounded;
      case 'add_business_rounded':
        return Icons.storefront_rounded;
      default:
        return Icons.star_rounded;
    }
  }

  Color _parseColor(String colorHex) {
    try {
      final buffer = StringBuffer();
      if (colorHex.length == 6 || colorHex.length == 7) buffer.write('ff');
      buffer.write(colorHex.replaceFirst('#', ''));
      return Color(int.parse(buffer.toString(), radix: 16));
    } catch (_) {
      return const Color(0xFF5547E8);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activitiesAsync = ref.watch(userActivitiesProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF7F7FB),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF7F7FB),
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text(
          'My Activity & Visits',
          style: TextStyle(color: Color(0xFF172033), fontSize: 20, fontWeight: FontWeight.w800),
        ),
      ),
      body: activitiesAsync.when(
        data: (activities) {
          if (activities.isEmpty) {
            return RefreshIndicator(
              onRefresh: () async => ref.refresh(userActivitiesProvider),
              child: ListView(
                children: [
                  SizedBox(height: MediaQuery.of(context).size.height * 0.25),
                  Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.history_toggle_off_rounded, size: 64, color: Colors.grey.shade300),
                        const SizedBox(height: 12),
                        const Text(
                          'No recent activity',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF172033)),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Activities like reviews, saved places, and visits will appear here.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(userActivitiesProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: activities.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final act = activities[index];
                final iconData = _getIconData(act.icon);
                final iconColor = _parseColor(act.iconColor);

                return Card(
                  elevation: 0,
                  color: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    leading: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: iconColor.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(iconData, color: iconColor, size: 24),
                    ),
                    title: Text(
                      act.title,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF172033)),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (act.subtitle.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            act.subtitle,
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                          ),
                        ],
                        const SizedBox(height: 6),
                        Text(
                          act.time,
                          style: TextStyle(fontSize: 10, color: Colors.grey.shade400, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                    onTap: act.businessId != null
                        ? () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => BusinessDetailsScreen(businessId: act.businessId!),
                              ),
                            );
                          }
                        : null,
                  ),
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: Color(0xFF5547E8))),
        error: (err, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Failed to load activity feed: $err'),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.refresh(userActivitiesProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}


