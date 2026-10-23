class ActivityModel {
  final String id;
  final String type;
  final String icon;
  final String iconColor;
  final String title;
  final String subtitle;
  final String time;
  final String? businessId;
  final String? businessName;

  const ActivityModel({
    required this.id,
    required this.type,
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.time,
    this.businessId,
    this.businessName,
  });

  factory ActivityModel.fromJson(Map<String, dynamic> json) {
    return ActivityModel(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? 'general',
      icon: json['icon'] as String? ?? 'star_rounded',
      iconColor: json['iconColor'] as String? ?? '#FFA000',
      title: json['title'] as String? ?? '',
      subtitle: json['subtitle'] as String? ?? '',
      time: json['time'] as String? ?? '',
      businessId: json['businessId'] as String?,
      businessName: json['businessName'] as String?,
    );
  }
}

class ActivityStatsModel {
  final int savedPlaces;
  final int reviews;
  final int recentlyVisited;

  const ActivityStatsModel({
    required this.savedPlaces,
    required this.reviews,
    required this.recentlyVisited,
  });

  factory ActivityStatsModel.fromJson(Map<String, dynamic> json) {
    return ActivityStatsModel(
      savedPlaces: json['savedPlaces'] as int? ?? 0,
      reviews: json['reviews'] as int? ?? 0,
      recentlyVisited: json['recentlyVisited'] as int? ?? 0,
    );
  }
}
