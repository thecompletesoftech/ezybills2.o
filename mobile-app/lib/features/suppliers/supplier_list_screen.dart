import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/supplier_model.dart';
import '../../core/services/api_service.dart';
import '../../core/widgets/currency_text.dart';
import '../../core/widgets/empty_state.dart';
import '../../core/widgets/shimmer_list.dart';

class SupplierListScreen extends ConsumerWidget {
  const SupplierListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Suppliers')),
      body: FutureBuilder<List<SupplierModel>>(
        future: _loadSuppliers(),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const ShimmerList();
          }
          final suppliers = snap.data ?? [];
          if (suppliers.isEmpty) {
            return const EmptyState(
              message: 'No suppliers added yet',
              icon: Icons.local_shipping_outlined,
            );
          }
          return ListView.separated(
            itemCount: suppliers.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, i) {
              final s = suppliers[i];
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: Colors.blue.shade100,
                  child: Text(s.name[0].toUpperCase(),
                      style: const TextStyle(color: Colors.blue)),
                ),
                title: Text(s.name,
                    style: const TextStyle(fontWeight: FontWeight.w500)),
                subtitle: Text(s.phone ?? ''),
                trailing: s.hasDue
                    ? CurrencyText(s.dueAmount, color: Colors.red, bold: true)
                    : null,
              );
            },
          );
        },
      ),
    );
  }

  Future<List<SupplierModel>> _loadSuppliers() async {
    final list = await ApiService.getList('/suppliers');
    return list
        .map((e) => SupplierModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
