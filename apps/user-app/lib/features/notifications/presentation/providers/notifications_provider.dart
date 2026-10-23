import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/notifications_remote_data_source.dart';


final notificationsRemoteDataSourceProvider = Provider<NotificationsRemoteDataSource>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return NotificationsRemoteDataSource(apiClient: apiClient);
});

final unreadNotificationsCountProvider = FutureProvider<int>((ref) async {
  final dataSource = ref.watch(notificationsRemoteDataSourceProvider);
  return await dataSource.getUnreadCount();
});

class NotificationsNotifier extends StateNotifier<AsyncValue<List<NotificationItem>>> {
  final NotificationsRemoteDataSource _dataSource;

  NotificationsNotifier(this._dataSource) : super(const AsyncValue.loading()) {
    loadNotifications();
  }

  Future<void> loadNotifications() async {
    state = const AsyncValue.loading();
    try {
      final items = await _dataSource.getNotifications();
      state = AsyncValue.data(items);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> markAsRead(String id) async {
    await _dataSource.markAsRead(id);
    state.whenData((items) {
      state = AsyncValue.data(
        items.map((item) {
          if (item.id == id) {
            return NotificationItem(
              id: item.id,
              title: item.title,
              message: item.message,
              type: item.type,
              isRead: true,
              entityId: item.entityId,
              entityType: item.entityType,
              createdAt: item.createdAt,
            );
          }
          return item;
        }).toList(),
      );
    });
  }

  Future<void> markAllAsRead() async {
    await _dataSource.markAllAsRead();
    state.whenData((items) {
      state = AsyncValue.data(
        items.map((item) {
          return NotificationItem(
            id: item.id,
            title: item.title,
            message: item.message,
            type: item.type,
            isRead: true,
            entityId: item.entityId,
            entityType: item.entityType,
            createdAt: item.createdAt,
          );
        }).toList(),
      );
    });
  }
}

final notificationsProvider =
    StateNotifierProvider<NotificationsNotifier, AsyncValue<List<NotificationItem>>>((ref) {
  final dataSource = ref.watch(notificationsRemoteDataSourceProvider);
  return NotificationsNotifier(dataSource);
});
