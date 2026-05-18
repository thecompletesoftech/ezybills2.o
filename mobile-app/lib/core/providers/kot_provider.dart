import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/kot_model.dart';
import '../services/api_service.dart';

class KotNotifier extends AsyncNotifier<List<KotModel>> {
  String? _statusFilter;
  int? _tableFilter;

  @override
  Future<List<KotModel>> build() => _fetch();

  Future<List<KotModel>> _fetch() async {
    final params = <String, dynamic>{};
    if (_statusFilter != null) params['status'] = _statusFilter;
    if (_tableFilter != null) params['table_id'] = _tableFilter;
    final res = await ApiService.get('/kot', queryParameters: params);
    return (res['data'] as List).map((e) => KotModel.fromJson(e)).toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  void setStatusFilter(String? status) {
    _statusFilter = status;
    refresh();
  }

  void setTableFilter(int? tableId) {
    _tableFilter = tableId;
    refresh();
  }

  Future<KotModel> create(Map<String, dynamic> data) async {
    final res = await ApiService.post('/kot', data: data);
    final kot = KotModel.fromJson(res['data']);
    await refresh();
    return kot;
  }

  Future<void> markInProgress(int kotId) async {
    await ApiService.put('/kot/$kotId', data: {'status': 'in_progress'});
    await refresh();
  }

  Future<void> complete(int kotId) async {
    await ApiService.post('/kot/$kotId/complete');
    await refresh();
  }

  Future<void> cancel(int kotId) async {
    await ApiService.post('/kot/$kotId/cancel');
    await refresh();
  }
}

final kotProvider =
    AsyncNotifierProvider<KotNotifier, List<KotModel>>(KotNotifier.new);
