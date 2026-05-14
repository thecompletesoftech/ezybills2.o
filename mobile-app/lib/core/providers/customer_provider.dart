import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/customer_model.dart';
import '../services/api_service.dart';
import '../services/local_storage_service.dart';
import 'connectivity_provider.dart';

class CustomerNotifier extends AsyncNotifier<List<CustomerModel>> {
  @override
  Future<List<CustomerModel>> build() async {
    return _fetch();
  }

  Future<List<CustomerModel>> _fetch({String? search}) async {
    final isOnline = ref.read(connectivityProvider);
    if (!isOnline) {
      final cached = await LocalStorageService.getCachedCustomers();
      return cached.map(CustomerModel.fromJson).toList();
    }
    final params = <String, dynamic>{};
    if (search != null && search.isNotEmpty) params['search'] = search;
    final list =
        await ApiService.getList('/customers', queryParameters: params);
    final customers = list
        .map((e) => CustomerModel.fromJson(e as Map<String, dynamic>))
        .toList();
    if (search == null) {
      await LocalStorageService.cacheCustomers(
          customers.map((c) => c.toJson()).toList());
    }
    return customers;
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<void> search(String query) async {
    state = await AsyncValue.guard(() => _fetch(search: query));
  }

  Future<CustomerModel> create(Map<String, dynamic> data) async {
    final response = await ApiService.post('/customers', data: data);
    final customer = CustomerModel.fromJson(
        response['data'] as Map<String, dynamic>? ?? response);
    state = AsyncData([...state.valueOrNull ?? [], customer]);
    return customer;
  }

  Future<List<CustomerLedgerEntry>> getLedger(int customerId) async {
    final list = await ApiService.getList('/customers/$customerId/ledger');
    return list
        .map((e) =>
            CustomerLedgerEntry.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> recordPayment(int customerId, double amount, String method) async {
    await ApiService.post('/customers/$customerId/payment', data: {
      'amount': amount,
      'payment_method': method,
    });
    await refresh();
  }
}

final customerProvider =
    AsyncNotifierProvider<CustomerNotifier, List<CustomerModel>>(
  CustomerNotifier.new,
);
