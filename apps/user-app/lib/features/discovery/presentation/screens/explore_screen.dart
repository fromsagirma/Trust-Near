import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../business/presentation/screens/business_details_screen.dart';
import '../../domain/entities/place_item.dart';
import '../providers/discovery_provider.dart';
import '../widgets/nearby_business_card.dart';

class ExploreScreen extends ConsumerStatefulWidget {
  final String? initialCategory;
  final ValueChanged<String>? onCategorySelected;

  const ExploreScreen({
    super.key,
    this.initialCategory,
    this.onCategorySelected,
  });

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  final TextEditingController _searchController = TextEditingController();
  late String _selectedCategory;
  String _searchQuery = '';

  final List<String> _categories = [
    'All',
    'Restaurants',
    'Cafés',
    'Hotels',
    'Shopping',
    'Healthcare',
    'Services',
  ];

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.initialCategory ?? 'All';
  }

  @override
  void didUpdateWidget(covariant ExploreScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialCategory != null && widget.initialCategory != oldWidget.initialCategory) {
      setState(() {
        _selectedCategory = widget.initialCategory!;
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }
  bool _matchesCategory(PlaceItem place, String selectedCategory) {
    if (selectedCategory == 'All' || selectedCategory.trim().isEmpty) return true;

    final sel = selectedCategory.toLowerCase().trim();
    final catName = place.categoryName.toLowerCase().trim();
    final catId = place.categoryId;

    if (catName.contains(sel) || sel.contains(catName)) return true;

    // Semantic category normalization (handles accents, synonyms, and database category IDs)
    if (sel.contains('rest') || sel.contains('food') || sel.contains('eat') || sel.contains('dine')) {
      return catId == 1 || catName.contains('rest') || catName.contains('food');
    }
    if (sel.contains('caf') || sel.contains('coffee') || sel.contains('tea') || sel.contains('bakery') || sel.contains('pastry')) {
      return catId == 2 || catName.contains('caf') || catName.contains('coffee') || catName.contains('baker') || catName.contains('pastry');
    }
    if (sel.contains('hotel') || sel.contains('stay') || sel.contains('lodg') || sel.contains('guest') || sel.contains('pension')) {
      return catId == 3 || catId == 4 || catName.contains('hotel') || catName.contains('lodg');
    }
    if (sel.contains('shop') || sel.contains('store') || sel.contains('retail') || sel.contains('market') || sel.contains('supermarket') || sel.contains('grocer')) {
      return catId == 4 || catId == 6 || catName.contains('shop') || catName.contains('retail') || catName.contains('market') || catName.contains('supermarket');
    }
    if (sel.contains('health') || sel.contains('pharm') || sel.contains('med') || sel.contains('clinic') || sel.contains('hosp') || sel.contains('doctor')) {
      return catId == 5 || catId == 7 || catName.contains('pharm') || catName.contains('health') || catName.contains('clinic') || catName.contains('med');
    }
    if (sel.contains('serv') || sel.contains('bank') || sel.contains('salon') || sel.contains('repair') || sel.contains('clean')) {
      return catId == 5 || catId == 6 || catName.contains('serv') || catName.contains('bank') || catName.contains('salon');
    }

    return false;
  }

  bool _matchesQuery(PlaceItem place, String query) {
    if (query.trim().isEmpty) return true;
    final q = query.toLowerCase().trim();
    return place.name.toLowerCase().contains(q) ||
        place.landmarkDescription.toLowerCase().contains(q) ||
        place.locationDisplay.toLowerCase().contains(q) ||
        place.categoryName.toLowerCase().contains(q) ||
        (place.description != null && place.description!.toLowerCase().contains(q));
  }

  @override
  Widget build(BuildContext context) {
    final placesAsync = ref.watch(nearbyPlacesProvider);
    final favList = ref.watch(favoritesProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF7F7FB),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF7F7FB),
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text(
          'Explore Places',
          style: TextStyle(color: Color(0xFF172033), fontSize: 20, fontWeight: FontWeight.w800),
        ),
      ),
      body: Column(
        children: [
          // Search Input
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Container(
              height: 52,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: TextField(
                controller: _searchController,
                onChanged: (val) => setState(() => _searchQuery = val.trim()),
                decoration: InputDecoration(
                  hintText: 'Search by name, landmark, or category...',
                  hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
                  prefixIcon: const Icon(Icons.search, color: Color(0xFF5547E8)),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _searchQuery = '');
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ),

          // Category Filter Chips
          SizedBox(
            height: 48,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              scrollDirection: Axis.horizontal,
              itemCount: _categories.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final cat = _categories[index];
                final isSelected = cat == _selectedCategory;
                return ChoiceChip(
                  label: Text(cat),
                  selected: isSelected,
                  selectedColor: const Color(0xFF5547E8),
                  backgroundColor: Colors.white,
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : const Color(0xFF4A5568),
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    fontSize: 12,
                  ),
                  onSelected: (val) {
                    setState(() => _selectedCategory = cat);
                    if (widget.onCategorySelected != null) {
                      widget.onCategorySelected!(cat);
                    }
                  },
                );
              },
            ),
          ),

          const SizedBox(height: 8),

          // Results Section
          Expanded(
            child: placesAsync.when(
              data: (places) {
                final filtered = places.where((place) {
                  return _matchesCategory(place, _selectedCategory) && _matchesQuery(place, _searchQuery);
                }).toList();

                if (filtered.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.search_off_rounded, size: 64, color: Colors.grey.shade400),
                        const SizedBox(height: 12),
                        Text(
                          'No matching places found',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey.shade700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Try modifying your search or choosing a different category',
                          style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 14),
                  itemBuilder: (context, index) {
                    final item = filtered[index];
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
                        ref.read(favoritesProvider.notifier).toggleFavorite(item.id);
                      },
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => BusinessDetailsScreen(
                              businessId: item.id,
                            ),
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
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Error loading places: $err'),
                    const SizedBox(height: 10),
                    ElevatedButton(
                      onPressed: () => ref.refresh(nearbyPlacesProvider),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
