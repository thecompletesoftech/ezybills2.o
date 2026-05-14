import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/local_storage_service.dart';

class AuthNotifier extends AsyncNotifier<UserModel?> {
  @override
  Future<UserModel?> build() async {
    final token = LocalStorageService.getToken();
    if (token == null) return null;
    return LocalStorageService.getUser();
  }

  Future<void> login({required String email, required String password}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final response = await ApiService.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      final token = response['token'] as String;
      final user = UserModel.fromJson(
          (response['user'] ?? response) as Map<String, dynamic>);
      await LocalStorageService.saveToken(token);
      await LocalStorageService.saveUser(user.copyWith(token: token));
      return user;
    });
  }

  Future<void> loginWithOtp({required String phone, required String otp}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final response = await ApiService.post('/auth/verify-otp', data: {
        'phone': phone,
        'otp': otp,
      });
      final token = response['token'] as String;
      final user = UserModel.fromJson(
          (response['user'] ?? response) as Map<String, dynamic>);
      await LocalStorageService.saveToken(token);
      await LocalStorageService.saveUser(user.copyWith(token: token));
      return user;
    });
  }

  Future<void> sendOtp(String phone) async {
    await ApiService.post('/auth/send-otp', data: {'phone': phone});
  }

  Future<void> logout() async {
    try {
      await ApiService.post('/auth/logout', data: {});
    } catch (_) {}
    await LocalStorageService.clearToken();
    await LocalStorageService.clearUser();
    state = const AsyncData(null);
  }

  Future<void> refreshUser() async {
    final token = LocalStorageService.getToken();
    if (token == null) {
      state = const AsyncData(null);
      return;
    }
    state = await AsyncValue.guard(() async {
      final response = await ApiService.get('/auth/me');
      final user =
          UserModel.fromJson(response['data'] as Map<String, dynamic>? ?? response);
      await LocalStorageService.saveUser(user);
      return user;
    });
  }
}

final authProvider = AsyncNotifierProvider<AuthNotifier, UserModel?>(
  AuthNotifier.new,
);
