import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../../core/network/api_client.dart';
import '../../data/datasources/business_remote_data_source.dart';
import '../../data/repositories/business_repository_impl.dart';
import '../../domain/entities/business_detail.dart';
import '../../domain/repositories/business_repository.dart';

final businessRemoteDataSourceProvider = Provider<BusinessRemoteDataSource>((ref) {
  final apiClient = ApiClient(tokenStorage: ref.watch(tokenStorageProvider));
  return BusinessRemoteDataSource(apiClient: apiClient);
});

final businessRepositoryProvider = Provider<BusinessRepository>((ref) {
  final remoteDataSource = ref.watch(businessRemoteDataSourceProvider);
  return BusinessRepositoryImpl(remoteDataSource: remoteDataSource);
});

final businessDetailProvider = FutureProvider.family<BusinessDetail, String>((ref, id) async {
  final repository = ref.watch(businessRepositoryProvider);
  return await repository.getBusinessDetail(id);
});

final ownerBusinessesProvider = FutureProvider<List<BusinessDetail>>((ref) async {
  final repository = ref.watch(businessRepositoryProvider);
  return await repository.getOwnerBusinesses();
});

