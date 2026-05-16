import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/tax_rate_model.dart';
import '../services/api_service.dart';

class TaxRateNotifier extends AsyncNotifier<List<TaxRateModel>> {
  @override
  Future<List<TaxRateModel>> build() async {
    final list = await ApiService.getList('/tax-rates');
    return list
        .map((e) => TaxRateModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final list = await ApiService.getList('/tax-rates');
      return list
          .map((e) => TaxRateModel.fromJson(e as Map<String, dynamic>))
          .toList();
    });
  }

  Future<TaxRateModel> create(Map<String, dynamic> data) async {
    final response = await ApiService.post('/tax-rates', data: data);
    final taxRate = TaxRateModel.fromJson(
        response['data'] as Map<String, dynamic>? ?? response);
    state = AsyncData([...state.valueOrNull ?? [], taxRate]);
    return taxRate;
  }

  Future<TaxRateModel> edit(int id, Map<String, dynamic> data) async {
    final response = await ApiService.put('/tax-rates/$id', data: data);
    final updated = TaxRateModel.fromJson(
        response['data'] as Map<String, dynamic>? ?? response);
    state = AsyncData(
      (state.valueOrNull ?? []).map((t) => t.id == id ? updated : t).toList(),
    );
    return updated;
  }

  Future<void> delete(int id) async {
    await ApiService.delete('/tax-rates/$id');
    state = AsyncData(
      (state.valueOrNull ?? []).where((t) => t.id != id).toList(),
    );
  }
}

final taxRateProvider =
    AsyncNotifierProvider<TaxRateNotifier, List<TaxRateModel>>(
  TaxRateNotifier.new,
);
