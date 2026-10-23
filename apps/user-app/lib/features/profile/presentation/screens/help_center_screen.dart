import 'package:flutter/material.dart';

class HelpCenterScreen extends StatefulWidget {
  const HelpCenterScreen({super.key});

  @override
  State<HelpCenterScreen> createState() => _HelpCenterScreenState();
}

class _HelpCenterScreenState extends State<HelpCenterScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  final List<Map<String, String>> _faqItems = const [
    {
      'category': 'Getting Started',
      'question': 'What is TrustNear and how does it work?',
      'answer':
          'TrustNear is a hyper-local discovery and trust platform that helps you find nearby businesses, restaurants, cafés, and local services. Every listing includes verified ratings, customer reviews, exact coordinates, and clear landmark directions.',
    },
    {
      'category': 'Finding Nearby Places',
      'question': 'How does TrustNear detect places near me?',
      'answer':
          'TrustNear uses your device\'s GPS location to calculate exact walking or driving distances to registered businesses in your immediate area. You can adjust your search radius up to 5 km on the home dashboard.',
    },
    {
      'category': 'Maps & Navigation',
      'question': 'How do I get directions to a business using Google Maps?',
      'answer':
          'Tap any business card to view details, then tap the "Directions" or "Open in Maps" button. TrustNear will launch Google Maps with the business\'s exact coordinates and landmark description.',
    },
    {
      'category': 'Location Permissions',
      'question': 'What happens if I deny location permissions?',
      'answer':
          'If location services or permissions are disabled, TrustNear safely defaults to the city center (Addis Ababa). You can enable GPS permissions at any time from your device settings or the Location Settings page.',
    },
    {
      'category': 'Reviews & Ratings',
      'question': 'How can I write a review for a business?',
      'answer':
          'Open the business details page, scroll to "Reviews & Ratings", and tap "Write Review". Select a star rating from 1 to 5, write your feedback, and tap submit. Reviews are published immediately.',
    },
    {
      'category': 'Business Owners',
      'question': 'How do I register my business on TrustNear?',
      'answer':
          'Go to your Profile tab and tap "Become a Business Owner". Fill in your business name, category, phone number, operating hours, coordinates, and landmark description. Our moderation team reviews and approves listings promptly.',
    },
    {
      'category': 'Privacy Settings',
      'question': 'How can I manage who sees my saved places and activity?',
      'answer':
          'Navigate to Profile → Privacy & Security. You can choose whether your saved places, submitted reviews, and profile are visible to "Everyone", "Friends only", or "No one".',
    },
    {
      'category': 'Account & Profile',
      'question': 'How do I edit my name or update my profile photo?',
      'answer':
          'Go to Profile → Edit Profile. You can update your display name, phone number, or tap your profile avatar to upload a new profile photo directly from your camera or gallery.',
    },
    {
      'category': 'Account & Security',
      'question': 'How do I delete my account?',
      'answer':
          'Go to Profile → Delete Account. Enter your account password to confirm. All your personal data and tokens will be permanently and securely removed from the database.',
    },
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filteredFaqs = _faqItems.where((item) {
      if (_searchQuery.isEmpty) return true;
      final q = item['question']!.toLowerCase();
      final a = item['answer']!.toLowerCase();
      final c = item['category']!.toLowerCase();
      final s = _searchQuery.toLowerCase();
      return q.contains(s) || a.contains(s) || c.contains(s);
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF7F7FC),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF172033)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Help Center',
          style: TextStyle(
            color: Color(0xFF172033),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: Column(
        children: [
          // Search Header Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
            color: const Color(0xFFF7F8FC),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'How can we help you?',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF172033)),
                ),
                const SizedBox(height: 12),
                Container(
                  height: 50,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
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
                      hintText: 'Search questions, topics, or features...',
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
              ],
            ),
          ),

          // FAQ List
          Expanded(
            child: filteredFaqs.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.help_outline_rounded, size: 56, color: Colors.grey.shade400),
                        const SizedBox(height: 10),
                        Text(
                          'No answers found for "$_searchQuery"',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Try searching for another topic or contact support below.',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                    itemCount: filteredFaqs.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final item = filteredFaqs[index];
                      return Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.02),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Theme(
                          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                          child: ExpansionTile(
                            tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                            leading: Container(
                              width: 32,
                              height: 32,
                              decoration: const BoxDecoration(
                                color: Color(0xFFEEF0FF),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.question_mark_rounded, size: 16, color: Color(0xFF5547E8)),
                            ),
                            title: Text(
                              item['question']!,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF172033),
                              ),
                            ),
                            subtitle: Text(
                              item['category']!,
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey.shade500,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            children: [
                              Padding(
                                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                                child: Text(
                                  item['answer']!,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey.shade700,
                                    height: 1.5,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
