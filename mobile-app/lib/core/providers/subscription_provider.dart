import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/plan_model.dart';
import '../services/api_service.dart';

class SubscriptionStatus {
  const SubscriptionStatus({
    this.plan,
    this.expiresAt,
    required this.daysLeft,
    required this.isActive,
    required this.isTrial,
  });

  factory SubscriptionStatus.fromJson(Map<String, dynamic> json) {
    final planData = json['plan'] as Map<String, dynamic>?;
    return SubscriptionStatus(
      plan: planData != null ? PlanModel.fromJson(planData) : null,
      expiresAt: json['expires_at'] != null
          ? DateTime.tryParse(json['expires_at'] as String)
          : null,
      daysLeft: (json['days_left'] as int?) ?? 0,
      isActive: (json['is_active'] as bool?) ?? false,
      isTrial: (json['is_trial'] as bool?) ?? true,
    );
  }

  final PlanModel? plan;
  final DateTime? expiresAt;
  final int daysLeft;
  final bool isActive;
  final bool isTrial;
}

class SubscriptionNotifier extends AsyncNotifier<SubscriptionStatus?> {
  @override
  Future<SubscriptionStatus?> build() => _fetch();

  Future<SubscriptionStatus?> _fetch() async {
    final response = await ApiService.get('/my-plan');
    final data = response['data'] as Map<String, dynamic>? ?? response;
    return SubscriptionStatus.fromJson(data);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }
}

final subscriptionProvider =
    AsyncNotifierProvider<SubscriptionNotifier, SubscriptionStatus?>(
  SubscriptionNotifier.new,
);
