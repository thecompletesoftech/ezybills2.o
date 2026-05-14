import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/invoice_model.dart';
import '../services/api_service.dart';
import '../services/local_storage_service.dart';
import 'connectivity_provider.dart';
import 'cart_provider.dart';

class InvoiceNotifier extends AsyncNotifier<List<InvoiceModel>> {
  @override
  Future<List<InvoiceModel>> build() async {
    return _fetch();
  }

  Future<List<InvoiceModel>> _fetch({Map<String, dynamic>? params}) async {
    final list =
        await ApiService.getList('/invoices', queryParameters: params);
    return list
        .map((e) => InvoiceModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<InvoiceModel?> createFromCart(
      WidgetRef ref, Map<String, dynamic> paymentData) async {
    final cart = ref.read(cartProvider);
    final isOnline = ref.read(connectivityProvider);

    final payload = {
      ...cart.toInvoicePayload(),
      ...paymentData,
    };

    if (!isOnline) {
      final tempId =
          'offline_${DateTime.now().millisecondsSinceEpoch}';
      await LocalStorageService.saveOfflineInvoice(tempId, payload);
      ref.read(cartProvider.notifier).clear();
      return null;
    }

    final response = await ApiService.post('/invoices', data: payload);
    final invoice = InvoiceModel.fromJson(
        response['data'] as Map<String, dynamic>? ?? response);
    ref.read(cartProvider.notifier).clear();
    state = AsyncData([invoice, ...state.valueOrNull ?? []]);
    return invoice;
  }

  Future<InvoiceModel?> getById(int id) async {
    final response = await ApiService.get('/invoices/$id');
    return InvoiceModel.fromJson(
        response['data'] as Map<String, dynamic>? ?? response);
  }

  Future<List<InvoiceModel>> getHeld() async {
    return _fetch(params: {'status': 'held'});
  }

  Future<void> holdInvoice(int id) async {
    await ApiService.post('/invoices/$id/hold', data: {});
    await refresh();
  }

  Future<void> resumeInvoice(int id) async {
    await ApiService.post('/invoices/$id/resume', data: {});
  }

  Future<void> syncOfflineInvoices() async {
    final pending = await LocalStorageService.getPendingInvoices();
    for (final payload in pending) {
      try {
        await ApiService.post('/invoices', data: payload);
        final tempId = payload['temp_id'] as String?;
        if (tempId != null) {
          await LocalStorageService.deleteOfflineInvoice(tempId);
        }
      } catch (_) {
        break;
      }
    }
    if (pending.isNotEmpty) await refresh();
  }
}

final invoiceProvider =
    AsyncNotifierProvider<InvoiceNotifier, List<InvoiceModel>>(
  InvoiceNotifier.new,
);
