import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/models/product_model.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/providers/product_provider.dart';
import '../../core/widgets/currency_text.dart';
import '../../core/widgets/empty_state.dart';
import '../../core/widgets/shimmer_list.dart';
import 'held_invoices_screen.dart';
import 'payment_screen.dart';

class PosScreen extends ConsumerStatefulWidget {
  const PosScreen({super.key});

  @override
  ConsumerState<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends ConsumerState<PosScreen> {
  final _searchController = TextEditingController();
  bool _scanning = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _addToCart(ProductModel product) {
    ref.read(cartProvider.notifier).addProduct(
          productId: product.id,
          productName: product.name,
          unitPrice: product.salePrice,
          taxPercentage: product.gstPercentage,
          taxType: product.taxType,
          unitName: product.primaryUnitName,
          barcode: product.barcode,
        );
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product.name} added'),
        duration: const Duration(milliseconds: 600),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final productsAsync = ref.watch(productProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('POS Billing'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            onPressed: () => setState(() => _scanning = !_scanning),
          ),
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.pause_circle_outline),
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const HeldInvoicesScreen()),
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search products...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          ref.read(productProvider.notifier).setSearch('');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8)),
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
              onChanged: (v) =>
                  ref.read(productProvider.notifier).setSearch(v),
            ),
          ),

          // Scanner
          if (_scanning)
            SizedBox(
              height: 160,
              child: MobileScanner(
                onDetect: (capture) async {
                  final barcode = capture.barcodes.first.rawValue;
                  if (barcode == null) return;
                  setState(() => _scanning = false);
                  final product = await ref
                      .read(productProvider.notifier)
                      .findByBarcode(barcode);
                  if (product != null) {
                    _addToCart(product);
                  } else if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Product not found')),
                    );
                  }
                },
              ),
            ),

          // Products grid
          Expanded(
            child: productsAsync.when(
              loading: () => const ShimmerList(),
              error: (e, _) => ErrorRetry(
                error: e,
                onRetry: () =>
                    ref.read(productProvider.notifier).refresh(),
              ),
              data: (products) => products.isEmpty
                  ? const EmptyState(
                      message: 'No products found',
                      icon: Icons.inventory_2_outlined)
                  : GridView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 1.5,
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                      ),
                      itemCount: products.length,
                      itemBuilder: (_, i) =>
                          _ProductTile(product: products[i], onTap: _addToCart),
                    ),
            ),
          ),

          // Cart summary bar
          if (!cart.isEmpty)
            _CartBar(cart: cart),
        ],
      ),
    );
  }
}

class _ProductTile extends StatelessWidget {
  const _ProductTile({required this.product, required this.onTap});

  final ProductModel product;
  final void Function(ProductModel) onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: () => onTap(product),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (product.isLowStock)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade100,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text('Low Stock',
                        style: TextStyle(
                            fontSize: 9, color: Colors.orange.shade800)),
                  ),
                const Spacer(),
                Text(product.name,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 13),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    CurrencyText(product.salePrice,
                        bold: true,
                        color: Theme.of(context).colorScheme.primary),
                    Text('Qty: ${product.currentStock.toInt()}',
                        style: TextStyle(
                            fontSize: 11, color: Colors.grey.shade600)),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
}

class _CartBar extends ConsumerWidget {
  const _CartBar({required this.cart});

  final CartState cart;

  @override
  Widget build(BuildContext context, WidgetRef ref) => Container(
        color: Theme.of(context).colorScheme.primary,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('${cart.itemCount} item(s)',
                    style: const TextStyle(color: Colors.white70, fontSize: 12)),
                CurrencyText(cart.total,
                    bold: true,
                    color: Colors.white,
                    style: const TextStyle(fontSize: 18)),
              ],
            ),
            const Spacer(),
            ElevatedButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PaymentScreen()),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: Theme.of(context).colorScheme.primary,
              ),
              child: const Text('Checkout →'),
            ),
          ],
        ),
      );
}
