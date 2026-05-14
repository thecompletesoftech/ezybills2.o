import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/customer_model.dart';
import '../../core/providers/customer_provider.dart';
import '../../core/widgets/currency_text.dart';
import '../../core/widgets/empty_state.dart';
import '../../core/widgets/shimmer_list.dart';
import 'record_payment_screen.dart';

class CustomerDetailScreen extends ConsumerWidget {
  const CustomerDetailScreen({super.key, required this.customerId});

  final int customerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final customers = ref.watch(customerProvider).valueOrNull ?? [];
    final customer = customers.where((c) => c.id == customerId).firstOrNull;

    return Scaffold(
      appBar: AppBar(
        title: Text(customer?.name ?? 'Customer'),
        actions: [
          if (customer != null && customer.hasDue)
            TextButton.icon(
              icon: const Icon(Icons.payment, color: Colors.white),
              label: const Text('Collect Due',
                  style: TextStyle(color: Colors.white)),
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) =>
                      RecordPaymentScreen(customer: customer),
                ),
              ),
            ),
        ],
      ),
      body: customer == null
          ? const Center(child: CircularProgressIndicator())
          : _CustomerBody(customer: customer, ref: ref),
    );
  }
}

class _CustomerBody extends StatelessWidget {
  const _CustomerBody({required this.customer, required this.ref});

  final CustomerModel customer;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) => ListView(
        children: [
          // Stats
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: _StatCard(
                      'Total Purchases', customer.totalPurchases,
                      color: Colors.blue),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard('Due Amount', customer.dueAmount,
                      color: customer.hasDue ? Colors.red : Colors.green),
                ),
              ],
            ),
          ),

          // Info
          ListTile(
            leading: const Icon(Icons.phone),
            title: Text(customer.phone ?? 'No phone'),
          ),
          if (customer.email != null)
            ListTile(
              leading: const Icon(Icons.email),
              title: Text(customer.email!),
            ),
          if (customer.address != null)
            ListTile(
              leading: const Icon(Icons.location_on),
              title: Text(customer.address!),
            ),
          if (customer.gstNumber != null)
            ListTile(
              leading: const Icon(Icons.receipt),
              title: Text('GST: ${customer.gstNumber}'),
            ),

          const Divider(),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text('Ledger',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ),

          FutureBuilder<List<CustomerLedgerEntry>>(
            future: ref.read(customerProvider.notifier).getLedger(customer.id),
            builder: (context, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return const ShimmerList(itemCount: 4);
              }
              final entries = snap.data ?? [];
              if (entries.isEmpty) {
                return const EmptyState(message: 'No transactions yet');
              }
              return Column(
                children: entries.map((e) {
                  final isCredit = e.isCredit;
                  return ListTile(
                    leading: Icon(
                      isCredit ? Icons.arrow_upward : Icons.arrow_downward,
                      color: isCredit ? Colors.green : Colors.red,
                    ),
                    title: Text(e.description ?? e.type),
                    subtitle: Text(e.createdAt.toString().split(' ').first),
                    trailing: CurrencyText(
                      e.amount,
                      color: isCredit ? Colors.green : Colors.red,
                      bold: true,
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      );
}

class _StatCard extends StatelessWidget {
  const _StatCard(this.label, this.amount, {required this.color});

  final String label;
  final double amount;
  final Color color;

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: const TextStyle(fontSize: 12, color: Colors.grey)),
              const SizedBox(height: 4),
              CurrencyText(amount, bold: true, color: color,
                  style: const TextStyle(fontSize: 18)),
            ],
          ),
        ),
      );
}
