import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/product_model.dart';
import '../services/api_service.dart';
import '../services/local_storage_service.dart';
import 'connectivity_provider.dart';

class ProductNotifier extends AsyncNotifier<List<ProductModel>> {
  String _search = '';
  int? _categoryId;
  String? _stockFilter;

  @override
  Future<List<ProductModel>> build() async {
    return _fetchProducts();
  }

  Future<List<ProductModel>> _fetchProducts() async {
    final isOnline = ref.read(connectivityProvider);
    if (!isOnline) {
      final cached = await LocalStorageService.getCachedProducts();
      return cached.map(ProductModel.fromJson).toList();
    }
    final params = <String, dynamic>{};
    if (_search.isNotEmpty) params['search'] = _search;
    if (_categoryId != null) params['category_id'] = _categoryId;
    if (_stockFilter != null) params['stock_status'] = _stockFilter;
    final list = await ApiService.getList('/products', queryParameters: params);
    final products = list
        .map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
        .toList();
    if (_search.isEmpty && _categoryId == null && _stockFilter == null) {
      await LocalStorageService.cacheProducts(
          products.map((p) => p.toJson()).toList());
    }
    return products;
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetchProducts);
  }

  void setSearch(String query) {
    _search = query;
    state = const AsyncLoading();
    AsyncValue.guard(_fetchProducts).then((v) => state = v);
  }

  void setCategory(int? categoryId) {
    _categoryId = categoryId;
    state = const AsyncLoading();
    AsyncValue.guard(_fetchProducts).then((v) => state = v);
  }

  void setStockFilter(String? filter) {
    _stockFilter = filter;
    state = const AsyncLoading();
    AsyncValue.guard(_fetchProducts).then((v) => state = v);
  }

  Future<ProductModel?> findByBarcode(String barcode) async {
    try {
      final response =
          await ApiService.get('/products/barcode/$barcode');
      return ProductModel.fromJson(
          response['data'] as Map<String, dynamic>? ?? response);
    } catch (_) {
      return null;
    }
  }

  Future<ProductModel> create(Map<String, dynamic> data) async {
    final response =
        await ApiService.post('/products', data: data, isFormData: true);
    final product = ProductModel.fromJson(
        response['data'] as Map<String, dynamic>? ?? response);
    state = AsyncData([...state.valueOrNull ?? [], product]);
    return product;
  }

  Future<ProductModel> updateProduct(int id, Map<String, dynamic> data) async {
    final response = await ApiService.put('/products/$id', data: data);
    final updated = ProductModel.fromJson(
        response['data'] as Map<String, dynamic>? ?? response);
    state = AsyncData(
      (state.valueOrNull ?? [])
          .map((p) => p.id == id ? updated : p)
          .toList(),
    );
    return updated;
  }
}

final productProvider =
    AsyncNotifierProvider<ProductNotifier, List<ProductModel>>(
  ProductNotifier.new,
);
