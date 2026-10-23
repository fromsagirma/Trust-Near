import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/activity_remote_data_source.dart';
import '../../data/models/activity_model.dart';

final activityRemoteDataSourceProvider = Provider<ActivityRemoteDataSource>((ref) {
  final apiClient = ApiClient(tokenStorage: ref.watch(tokenStorageProvider));
  return ActivityRemoteDataSource(apiClient: apiClient);
});

final userActivitiesProvider = FutureProvider<List<ActivityModel>>((ref) async {
  final dataSource = ref.watch(activityRemoteDataSourceProvider);
  return await dataSource.getUserActivities();
});

final userActivityStatsProvider = FutureProvider<ActivityStatsModel>((ref) async {
  final dataSource = ref.watch(activityRemoteDataSourceProvider);
  return await dataSource.getActivityStats();
});
