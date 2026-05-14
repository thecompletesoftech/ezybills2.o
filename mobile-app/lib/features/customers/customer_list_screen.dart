import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/customer_provider.dart';
import '../../core/widgets/currency_text.dart';
import '../../core/widgets/empty_state.dart';
import '../../core/widgets/shimmer_list.dart';
import 'customer_detail_screen.dart';
import 'customer_form_screen.dart';

class CustomerListScreen extends ConsumerStatefulWidget {
  const CustomerListScreen({super.key});

  @override
  ConsumerState<CustomerListScreen> createState() =>
      _CustomerListScreenState();
}

class _CustomerListScreenState extends ConsumerState<CustomerListScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final customersAsync = ref.watch(customerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Customers'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const CustomerFormScreen()),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search customers...',
                prefixIcon: const Icon(Icons.search),
                border:
                    OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
              onChanged: (v) => ref.read(customerProvider.notifier).search(v),
            ),
          ),
          Expanded(
            child: customersAsync.when(
              loading: () => const ShimmerList(),
              error: (e, _) => ErrorRetry(
                error: e,
                onRetry: () => ref.read(customerProvider.notifier).refresh(),
              ),
              data: (customers) => customers.isEmpty
                  ? EmptyState(
                      message: 'No customers yet',
                      icon: Icons.people_outline,
                      action: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const CustomerFormScreen()),
                      ),
                      actionLabel: 'Add Customer',
                    )
                  : RefreshIndicator(
                      onRefresh: () =>
                          ref.read(customerProvider.notifier).refresh(),
                      child: ListView.separated(
                        itemCount: customers.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (_, i) {
                          final c = customers[i];
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: c.hasDue
                                  ? Colors.red.shade100
                                  : Colors.green.shade100,
                              child: Text(c.name[0].toUpperCase(),
                                  style: TextStyle(
                                      color: c.hasDue
                                          ? Colors.red
                                          : Colors.green,
                                      fontWeight: FontWeight.bold)),
                            ),
                            title: Text(c.name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w500)),
                            subtitle:
                                Text(c.phone ?? c.email ?? ''),
                            trailing: c.hasDue
                                ? Column(
                                    mainAxisAlignment:
                                        MainAxisAlignment.center,
                                    crossAxisAlignment:
                                        CrossAxisAlignment.end,
                                    children: [
                                      CurrencyText(c.dueAmount,
                                          color: Colors.red, bold: true),
                                      const Text('Due',
                                          style: TextStyle(
                                              fontSize: 10,
                                              color: Colors.red)),
                                    ],
                                  )
                                : null,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) =>
                                    CustomerDetailScreen(customerId: c.id),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
