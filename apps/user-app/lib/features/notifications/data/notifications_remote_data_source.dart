import '../../../../core/network/api_client.dart';

class NotificationItem {

  final String id;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final String? entityId;
  final String? entityType;
  final DateTime createdAt;

  NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.isRead,
    this.entityId,
    this.entityType,
    required this.createdAt,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Notification',
      message: json['message']?.toString() ?? '',
      type: json['type']?.toString() ?? 'general',
      isRead: json['isRead'] == true || json['is_read'] == true,
      entityId: json['entityId']?.toString() ?? json['entity_id']?.toString(),
      entityType: json['entityType']?.toString() ?? json['entity_type']?.toString(),
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class NotificationsRemoteDataSource {
  final ApiClient apiClient;

  NotificationsRemoteDataSource({required this.apiClient});

  Future<List<NotificationItem>> getNotifications({
    int page = 1,
    int pageSize = 20,
    bool unreadOnly = false,
  }) async {
    try {
      final response = await apiClient.dio.get(
        '/notifications',
        queryParameters: {
          'page': page,
          'pageSize': pageSize,
          if (unreadOnly) 'unreadOnly': 'true',
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        List itemsList = [];
        if (data is List) {
          itemsList = data;
        } else if (data is Map && data['notifications'] is List) {
          itemsList = data['notifications'];
        } else if (data is Map && data['items'] is List) {
          itemsList = data['items'];
        }

        return itemsList.map((item) => NotificationItem.fromJson(item)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<int> getUnreadCount() async {
    try {
      final response = await apiClient.dio.get('/notifications/unread-count');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        if (data is Map && data['unreadCount'] != null) {
          return data['unreadCount'] is int
              ? data['unreadCount']
              : int.tryParse(data['unreadCount'].toString()) ?? 0;
        }
      }
      return 0;
    } catch (_) {
      return 0;
    }
  }

  Future<bool> markAsRead(String notificationId) async {
    try {
      final response = await apiClient.dio.patch('/notifications/$notificationId/read');
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<bool> markAllAsRead() async {
    try {
      final response = await apiClient.dio.patch('/notifications/read-all');
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
