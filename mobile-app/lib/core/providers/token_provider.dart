import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/token_model.dart';
import '../services/api_service.dart';

class TokenNotifier extends AsyncNotifier<List<TokenModel>> {
  String? _statusFilter;

  @override
  Future<List<TokenModel>> build() => _fetch();

  Future<List<TokenModel>> _fetch() async {
    final params = <String, dynamic>{};
    if (_statusFilter != null) params['status'] = _statusFilter;
    final res = await ApiService.get('/tokens', queryParameters: params);
    return (res['data'] as List? ?? []).map((e) => TokenModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  void setStatusFilter(String? status) {
    _statusFilter = status;
    refresh();
  }

  Future<TokenModel> create(Map<String, dynamic> data) async {
    final res = await ApiService.post('/tokens', data: data);
    final token = TokenModel.fromJson(res['data']);
    await refresh();
    return token;
  }

  Future<void> markReady(int tokenId) async {
    await ApiService.post('/tokens/$tokenId/ready');
    await refresh();
  }

  Future<void> markServed(int tokenId) async {
    await ApiService.put('/tokens/$tokenId', data: {'status': 'served'});
    await refresh();
  }

  Future<void> cancel(int tokenId) async {
    await ApiService.delete('/tokens/$tokenId');
    await refresh();
  }
}

final tokenProvider =
    AsyncNotifierProvider<TokenNotifier, List<TokenModel>>(TokenNotifier.new);
