import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../business/presentation/screens/business_details_screen.dart';
import '../../domain/entities/friend_model.dart';
import '../providers/friends_provider.dart';

class FriendDetailScreen extends ConsumerStatefulWidget {
  final String friendId;

  const FriendDetailScreen({super.key, required this.friendId});

  @override
  ConsumerState<FriendDetailScreen> createState() => _FriendDetailScreenState();
}

class _FriendDetailScreenState extends ConsumerState<FriendDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(friendsProvider);
    final friend = ref.read(friendsProvider.notifier).getFriendById(widget.friendId);


    if (friend == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Friend Details')),
        body: const Center(child: Text('Friend not found or removed')),
      );
    }

    final initials = friend.displayName.isNotEmpty
        ? friend.displayName.substring(0, 1).toUpperCase()
        : 'F';

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF7F8FC),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF172033)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          friend.displayName,
          style: const TextStyle(color: Color(0xFF172033), fontSize: 18, fontWeight: FontWeight.bold),
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert_rounded, color: Color(0xFF172033)),
            onSelected: (val) {
              if (val == 'remove') {
                _confirmRemoveFriend(friend.id, friend.displayName);
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(
                value: 'remove',
                child: Row(
                  children: [
                    Icon(Icons.person_remove_rounded, color: Colors.red, size: 18),
                    SizedBox(width: 8),
                    Text('Remove Friend', style: TextStyle(color: Colors.red)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
                ),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 44,
                      backgroundColor: const Color(0xFF5547E8),
                      backgroundImage: friend.profilePhotoUrl != null ? NetworkImage(friend.profilePhotoUrl!) : null,
                      child: friend.profilePhotoUrl == null
                          ? Text(initials, style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white))
                          : null,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      friend.displayName,
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF172033)),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      friend.email,
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                    ),
                    if (friend.phone != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        friend.phone!,
                        style: const TextStyle(fontSize: 12, color: Color(0xFF5547E8), fontWeight: FontWeight.w600),
                      ),
                    ],
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F5E9),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.check_circle_rounded, color: Color(0xFF2E7D32), size: 16),
                          SizedBox(width: 6),
                          Text(
                            'Connected Friend',
                            style: TextStyle(color: Color(0xFF2E7D32), fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverPersistentHeader(
              pinned: true,
              delegate: _SliverAppBarDelegate(
                TabBar(
                  controller: _tabController,
                  labelColor: const Color(0xFF5547E8),
                  unselectedLabelColor: Colors.grey.shade600,
                  indicatorColor: const Color(0xFF5547E8),
                  indicatorWeight: 3,
                  labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  tabs: [
                    Tab(text: "Activity & Visits (${friend.activities.length})"),
                    Tab(text: "Favorites (${friend.favoritePlaces.length})"),
                  ],
                ),
              ),
            ),
          ];
        },
        body: TabBarView(
          controller: _tabController,
          children: [
            // Tab 1: Activities
            _buildActivityTab(friend),

            // Tab 2: Favorites
            _buildFavoritesTab(friend),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityTab(FriendModel friend) {

    if (!friend.isActivityAllowed) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.lock_outline_rounded, size: 56, color: Colors.grey.shade400),
              const SizedBox(height: 12),
              const Text(
                'Activity is Private',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF172033)),
              ),
              const SizedBox(height: 6),
              Text(
                '${friend.displayName} has kept their visits and reviews private.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
      );
    }

    if (friend.activities.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history_toggle_off_rounded, size: 56, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            const Text(
              'No recent activity',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF172033)),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: friend.activities.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final act = friend.activities[index];
        IconData icon = Icons.star_rounded;
        Color iconColor = const Color(0xFFFFA000);

        if (act.type == 'visit') {
          icon = Icons.verified_rounded;
          iconColor = const Color(0xFF07945E);
        } else if (act.type == 'save') {
          icon = Icons.bookmark_rounded;
          iconColor = const Color(0xFF5547E8);
        }

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
              child: Icon(icon, color: iconColor, size: 22),
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
                  Text(act.subtitle, style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
                ],
                const SizedBox(height: 6),
                Text(act.time, style: TextStyle(fontSize: 10, color: Colors.grey.shade400, fontWeight: FontWeight.w500)),
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
    );
  }

  Widget _buildFavoritesTab(FriendModel friend) {

    if (!friend.isFavoritesAllowed) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.lock_outline_rounded, size: 56, color: Colors.grey.shade400),
              const SizedBox(height: 12),
              const Text(
                'Favorites are Private',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF172033)),
              ),
              const SizedBox(height: 6),
              Text(
                '${friend.displayName} has kept their saved places private.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
      );
    }

    if (friend.favoritePlaces.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.bookmark_border_rounded, size: 56, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            const Text(
              'No favorite places yet',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF172033)),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: friend.favoritePlaces.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final place = friend.favoritePlaces[index];

        return Card(
          elevation: 0,
          color: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: ListTile(
            contentPadding: const EdgeInsets.all(12),
            leading: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: place.photoUrl != null
                  ? Image.network(
                      place.photoUrl!,
                      width: 54,
                      height: 54,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => Container(
                        width: 54,
                        height: 54,
                        color: const Color(0xFFEEF0FF),
                        child: const Icon(Icons.storefront_rounded, color: Color(0xFF5547E8)),
                      ),
                    )
                  : Container(
                      width: 54,
                      height: 54,
                      color: const Color(0xFFEEF0FF),
                      child: const Icon(Icons.storefront_rounded, color: Color(0xFF5547E8)),
                    ),
            ),
            title: Text(
              place.name,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF172033)),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Text(
                  place.landmarkDescription.isNotEmpty ? place.landmarkDescription : place.categoryName,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.star_rounded, size: 16, color: Color(0xFFFFA000)),
                    const SizedBox(width: 4),
                    Text(
                      '${place.rating} (${place.reviewCount})',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF172033)),
                    ),
                  ],
                ),
              ],
            ),
            trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.grey),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => BusinessDetailsScreen(businessId: place.id),
                ),
              );
            },
          ),
        );
      },
    );
  }

  void _confirmRemoveFriend(String friendId, String name) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('Remove Friend'),
        content: Text('Are you sure you want to remove $name from your friends list?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              ref.read(friendsProvider.notifier).removeFriend(friendId);
              Navigator.pop(dialogCtx);
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Removed $name from friends'), backgroundColor: Colors.red),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }
}

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;

  _SliverAppBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;
  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: const Color(0xFFF7F8FC),
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) {
    return false;
  }
}
