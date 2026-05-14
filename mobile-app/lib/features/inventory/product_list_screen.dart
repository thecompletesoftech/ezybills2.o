import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/product_provider.dart';
import '../../core/widgets/currency_text.dart';
import '../../core/widgets/empty_state.dart';
import '../../core/widgets/shimmer_list.dart';
import 'product_form_screen.dart';
import 'stock_adjustment_screen.dart';

class ProductListScreen extends ConsumerStatefulWidget {
  const ProductListScreen({super.key});

  @override
  ConsumerState<ProductListScreen> createState() => _ProductListScreenState();
}

class _ProductListScreenState extends ConsumerState<ProductListScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(productProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Products'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ProductFormScreen()),
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
                hintText: 'Search products...',
                prefixIcon: const Icon(Icons.search),
                border:
                    OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
              onChanged: (v) =>
                  ref.read(productProvider.notifier).setSearch(v),
            ),
          ),
          Expanded(
            child: productsAsync.when(
              loading: () => const ShimmerList(),
              error: (e, _) => ErrorRetry(
                error: e,
                onRetry: () => ref.read(productProvider.notifier).refresh(),
              ),
              data: (products) => products.isEmpty
                  ? EmptyState(
                      message: 'No products yet',
                      icon: Icons.inventory_2_outlined,
                      action: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const ProductFormScreen()),
                      ),
                      actionLabel: 'Add Product',
                    )
                  : RefreshIndicator(
                      onRefresh: () =>
                          ref.read(productProvider.notifier).refresh(),
                      child: ListView.separated(
                        itemCount: products.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (_, i) {
                          final p = products[i];
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: p.isLowStock
                                  ? Colors.orange.shade100
                                  : Colors.blue.shade100,
                              child: Icon(
                                p.isLowStock
                                    ? Icons.warning_amber
                                    : Icons.inventory_2,
                                color: p.isLowStock
                                    ? Colors.orange
                                    : Colors.blue,
                                size: 20,
                              ),
                            ),
                            title: Text(p.name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w500)),
                            subtitle: Text(
                                '${p.categoryName ?? ''} · Stock: ${p.currentStock.toInt()}'),
                            trailing: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                CurrencyText(p.salePrice, bold: true),
                                if (p.isLowStock)
                                  Text('Low Stock',
                                      style: TextStyle(
                                          fontSize: 10,
                                          color: Colors.orange.shade700)),
                              ],
                            ),
                            onLongPress: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) =>
                                    StockAdjustmentScreen(product: p),
                              ),
                            ),
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) =>
                                    ProductFormScreen(productId: p.id),
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
