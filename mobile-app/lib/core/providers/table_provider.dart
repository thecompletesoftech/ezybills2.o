import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/restaurant_table_model.dart';
import '../services/api_service.dart';

class TableNotifier extends AsyncNotifier<List<RestaurantTableModel>> {
  @override
  Future<List<RestaurantTableModel>> build() => _fetch();

  Future<List<RestaurantTableModel>> _fetch() async {
    final res = await ApiService.get('/tables');
    return (res['data'] as List)
        .map((e) => RestaurantTableModel.fromJson(e))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<void> create(Map<String, dynamic> data) async {
    await ApiService.post('/tables', data: data);
    await refresh();
  }

  Future<void> updateStatus(int tableId, String status) async {
    await ApiService.put('/tables/$tableId', data: {'status': status});
    await refresh();
  }

  Future<void> delete(int tableId) async {
    await ApiService.delete('/tables/$tableId');
    await refresh();
  }

  Future<void> merge(int sourceId, int targetId) async {
    await ApiService.post('/tables/$sourceId/merge',
        data: {'target_table_id': targetId});
    await refresh();
  }

  Future<void> shift(int sourceId, int targetId) async {
    await ApiService.post('/tables/$sourceId/shift',
        data: {'target_table_id': targetId});
    await refresh();
  }
}

final tableProvider =
    AsyncNotifierProvider<TableNotifier, List<RestaurantTableModel>>(
        TableNotifier.new);
