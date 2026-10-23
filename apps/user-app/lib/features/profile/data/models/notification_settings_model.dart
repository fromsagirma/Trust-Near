class NotificationSettingsModel {
  final bool pushNotificationsEnabled;
  final bool emailUpdatesEnabled;

  const NotificationSettingsModel({
    required this.pushNotificationsEnabled,
    required this.emailUpdatesEnabled,
  });

  factory NotificationSettingsModel.fromJson(Map<String, dynamic> json) {
    return NotificationSettingsModel(
      pushNotificationsEnabled: json['pushNotificationsEnabled'] as bool? ?? true,
      emailUpdatesEnabled: json['emailUpdatesEnabled'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'pushNotificationsEnabled': pushNotificationsEnabled,
      'emailUpdatesEnabled': emailUpdatesEnabled,
    };
  }
}
