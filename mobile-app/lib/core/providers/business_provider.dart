import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/business_model.dart';
import '../services/api_service.dart';
import '../services/local_storage_service.dart';

class BusinessNotifier extends AsyncNotifier<BusinessModel?> {
  @override
  Future<BusinessModel?> build() async {
    return LocalStorageService.getBusiness();
  }

  Future<void> loadBusiness() async {
    state = await AsyncValue.guard(() async {
      final response = await ApiService.get('/business');
      final data = response['data'] as Map<String, dynamic>? ?? response;
      final business = BusinessModel.fromJson(data);
      await LocalStorageService.saveBusiness(business);
      return business;
    });
  }

  Future<void> updateBusiness(Map<String, dynamic> payload) async {
    state = await AsyncValue.guard(() async {
      final response = await ApiService.put('/business', data: payload);
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

// Convenience: current business type
final isRestaurantProvider = Provider<bool>((ref) {
  final business = ref.watch(businessProvider).valueOrNull;
  return business?.isRestaurant ?? false;
});
