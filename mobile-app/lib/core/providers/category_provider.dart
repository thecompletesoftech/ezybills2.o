import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/category_model.dart';
import '../services/api_service.dart';

class CategoryNotifier extends AsyncNotifier<List<CategoryModel>> {
  @override
  Future<List<CategoryModel>> build() => _fetch();

  Future<List<CategoryModel>> _fetch() async {
    final list = await ApiService.getList(
      '/categories',
      queryParameters: {'per_page': 'all', 'is_active': '1'},
    );
    return list
        .map((e) => CategoryModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<CategoryModel>> fetchAll() async {
    final list = await ApiService.getList(
      '/categories',
      queryParameters: {'per_page': 'all'},
    );
    return list
        .map((e) => CategoryModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<void> create({
    required String name,
    String? description,
    bool isActive = true,
  }) async {
    await ApiService.post('/categories', data: {
      'name': name,
      if (description != null && description.isNotEmpty) 'description': description,
      'is_active': isActive ? '1' : '0',
    });
    await refresh();
  }

  Future<void> edit(
    int id, {
    required String name,
    String? description,
    required bool isActive,
  }) async {
    await ApiService.post(
      '/categories/$id?_method=PUT',
      data: {
        'name': name,
        if (description != null && description.isNotEmpty) 'description': description,
        'is_active': isActive ? '1' : '0',
      },
    );
    await refresh();
  }

  Future<void> remove(int id) async {
    await ApiService.delete('/categories/$id');
    await refresh();
  }
}

final categoryProvider =
    AsyncNotifierProvider<CategoryNotifier, List<CategoryModel>>(
  CategoryNotifier.new,
);
