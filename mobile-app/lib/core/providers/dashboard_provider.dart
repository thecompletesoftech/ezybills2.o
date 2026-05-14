import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/dashboard_model.dart';
import '../services/api_service.dart';

class DashboardNotifier extends AsyncNotifier<DashboardModel> {
  @override
  Future<DashboardModel> build() async {
    return _fetch();
  }

  Future<DashboardModel> _fetch() async {
    final response = await ApiService.get('/dashboard');
    return DashboardModel.fromJson(
        response['data'] as Map<String, dynamic>? ?? response);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }
}

final dashboardProvider =
    AsyncNotifierProvider<DashboardNotifier, DashboardModel>(
  DashboardNotifier.new,
);
