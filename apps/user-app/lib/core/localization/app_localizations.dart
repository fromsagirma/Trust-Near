import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/profile/presentation/providers/profile_provider.dart';

final appLanguageProvider = StateProvider<String>((ref) {
  final profileAsync = ref.watch(profileProvider);
  return profileAsync.value?.languagePref ?? 'en';
});

class AppStrings {
  static const Map<String, Map<String, String>> _localizedValues = {
    'en': {
      'good_morning': 'Good morning',
      'good_afternoon': 'Good afternoon',
      'good_evening': 'Good evening',
      'good_night': 'Good night',
      'find_trusted_places': 'Find trusted places\nnear you',
      'explore_categories': 'Explore categories',
      'near_you': 'Near you',
      'recommended_for_you': 'Recommended for you',
      'see_all': 'See all',
      'directions': 'Directions',
      'call': 'Call',
      'claim': 'Claim',
      'write_review': 'Write Review',
      'reviews_ratings': 'Reviews & Ratings',
      'explore_places': 'Explore Places',
      'saved_places': 'Saved Places',
      'my_activity': 'My Activity & Visits',
      'profile': 'Profile',
      'edit_profile': 'Edit Profile',
      'become_business_owner': 'Become a Business Owner',
      'owner_dashboard': 'Business Owner Dashboard',
      'language': 'Language / ቋንቋ',
      'notifications': 'Notifications',
      'logout': 'Log Out',
    },
    'am': {
      'good_morning': 'እንደምን አደሩ',
      'good_afternoon': 'እንደምን ዋሉ',
      'good_evening': 'እንደምን አመሹ',
      'good_night': 'ደህና እደሩ',
      'find_trusted_places': 'በአቅራቢያዎ ያሉ ታማኝ\nቦታዎችን ያግኙ',
      'explore_categories': 'ምድቦችን ያስሱ',
      'near_you': 'በአቅራቢያዎ',
      'recommended_for_you': 'ለእርስዎ የተመረጡ',
      'see_all': 'ሁሉንም ይመልከቱ',
      'directions': 'አቅጣጫ',
      'call': 'ይደውሉ',
      'claim': 'ባለቤትነት ይጠይቁ',
      'write_review': 'ግምገማ ይጻፉ',
      'reviews_ratings': 'ግምገማዎች እና ደረጃዎች',
      'explore_places': 'ቦታዎችን ያስሱ',
      'saved_places': 'የተቀመጡ ቦታዎች',
      'my_activity': 'የእኔ እንቅስቃሴ እና ጉብኝቶች',
      'profile': 'መገለጫ',
      'edit_profile': 'መገለጫ ያርትዑ',
      'become_business_owner': 'የንግድ ባለቤት ይሁኑ',
      'owner_dashboard': 'የንግድ ባለቤት ዳሽቦርድ',
      'language': 'ቋንቋ (Language)',
      'notifications': 'ማሳወቂያዎች',
      'logout': 'ይውጡ',
    },
    'om': {
      'good_morning': 'Akkam bulte',
      'good_afternoon': 'Akkam oolte',
      'good_evening': 'Akkam galte',
      'good_night': 'Nagaan bulaa',
      'find_trusted_places': 'Iddoowwan amanamaa\ndhihoo keessan jiran',
      'explore_categories': 'Ramaddiiwwan sakatta\'aa',
      'near_you': 'Dhihoo keessan',
      'recommended_for_you': 'Isiniif kan filatame',
      'see_all': 'Hunda ilaalaa',
      'directions': 'Kallattii',
      'call': 'Bilbilaa',
      'claim': 'Abbummaa gaafadhaa',
      'write_review': 'Yaada barreessaa',
      'reviews_ratings': 'Yaada fi Sadarkaa',
      'explore_places': 'Bakkeewwan sakatta\'aa',
      'saved_places': 'Bakkeewwan olkaa\'aman',
      'my_activity': 'Sochii koo',
      'profile': 'Profaayilii',
      'edit_profile': 'Profaayilii jijjiiraa',
      'become_business_owner': 'Abbaa daldalaa ta\'aa',
      'owner_dashboard': 'Daashboordii Abbaa Daldalaa',
      'language': 'Afaan (Language)',
      'notifications': 'Beeksisa',
      'logout': 'Ba\'aa',
    },
  };

  static String tr(String key, String langCode) {
    return _localizedValues[langCode]?[key] ?? _localizedValues['en']?[key] ?? key;
  }
}
