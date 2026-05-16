import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/supplier_model.dart';
import '../services/api_service.dart';

class SupplierNotifier extends AsyncNotifier<List<SupplierModel>> {
  @override
  Future<List<SupplierModel>> build() => _fetch();

  Future<List<SupplierModel>> _fetch({String? search}) async {
    final params = <String, dynamic>{};
    if (search != null && search.isNotEmpty) params['search'] = search;
    final list = await ApiService.getList('/suppliers', queryParameters: params);
    return list
        .map((e) => SupplierModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<void> search(String query) async {
    state = await AsyncValue.guard(() => _fetch(search: query));
  }

  Future<void> create(Map<String, dynamic> data) async {
    await ApiService.post('/suppliers', data: data);
    await refresh();
  }

  Future<void> edit(int id, Map<String, dynamic> data) async {
    await ApiService.put('/suppliers/$id', data: data);
    await refresh();
  }

  Future<void> delete(int id) async {
    await ApiService.delete('/suppliers/$id');
    state = AsyncData(
      (state.valueOrNull ?? []).where((s) => s.id != id).toList(),
    );
  }

  Future<void> recordPayment(int supplierId, double amount) async {
    await ApiService.post('/suppliers/$supplierId/ledger', data: {
      'amount': amount,
      'type': 'payment',
      'description': 'Payment made',
    });
    await refresh();
  }
}

final supplierProvider =
    AsyncNotifierProvider<SupplierNotifier, List<SupplierModel>>(
  SupplierNotifier.new,
);
