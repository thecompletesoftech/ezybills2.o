import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/business_model.dart';
import '../services/api_service.dart';
import '../services/local_storage_service.dart';
import 'auth_provider.dart';

class BusinessNotifier extends AsyncNotifier<BusinessModel?> {
  @override
  Future<BusinessModel?> build() async {
    return LocalStorageService.getBusiness();
  }

  Future<void> loadBusiness() async {
    final user = ref.read(authProvider).valueOrNull;
    final businessId = user?.businessId;
    if (businessId == null) return;

    state = await AsyncValue.guard(() async {
      final response = await ApiService.get('/business/$businessId');
      final data = response['data'] as Map<String, dynamic>? ?? response;
      final business = BusinessModel.fromJson(data);
      await LocalStorageService.saveBusiness(business);
      return business;
    });
  }

  Future<void> updateBusiness(Map<String, dynamic> payload) async {
    final id = state.valueOrNull?.id;
    if (id == null) return;

    state = await AsyncValue.guard(() async {
      final response = await ApiService.put('/business/$id', data: payload);
      final data = response['data'] as Map<String, dynamic>? ?? response;
      final business = BusinessModel.fromJson(data);
      await LocalStorageService.saveBusiness(business);
      return business;
    });
  }
}

final businessProvider =
    AsyncNotifierProvider<BusinessNotifier, BusinessModel?>(
  BusinessNotifier.new,
);

// True when admin has enabled KOT/restaurant features for this business
final kotEnabledProvider = Provider<bool>((ref) {
  final business = ref.watch(businessProvider).valueOrNull;
  return business?.kotEnabled ?? false;
});
