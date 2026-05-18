import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/models/customer_model.dart';
import '../../core/models/product_model.dart';
import '../../core/providers/business_provider.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/providers/category_provider.dart';
import '../../core/providers/kot_provider.dart';
import '../../core/providers/product_provider.dart';
import '../../core/services/api_service.dart';
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
  int? _selectedCategoryId;

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

  Future<void> _sendKot() async {
    final cart = ref.read(cartProvider);
    if (cart.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cart is empty')),
      );
      return;
    }
    try {
      await ref.read(kotProvider.notifier).create(cart.toKotPayload());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('KOT sent to kitchen'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final productsAsync = ref.watch(productProvider);
    final kotEnabled = ref.watch(kotEnabledProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('POS Billing'),
        actions: [
          if (kotEnabled)
            IconButton(
              icon: const Icon(Icons.restaurant_menu),
              tooltip: 'Send KOT',
              onPressed: _sendKot,
            ),
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            onPressed: () => setState(() => _scanning = !_scanning),
          ),
          IconButton(
            icon: const Icon(Icons.pause_circle_outline),
            tooltip: 'Held invoices',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const HeldInvoicesScreen()),
            ),
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

          // Category rail + products grid
          Expanded(
            child: Row(
              children: [
                // Left category rail
                _CategoryRail(
                  selectedId: _selectedCategoryId,
                  onSelect: (id) {
                    setState(() => _selectedCategoryId = id);
                    ref.read(productProvider.notifier).setCategory(id);
                  },
                ),
                // Right product grid
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
                            padding: const EdgeInsets.all(8),
                            gridDelegate:
                                const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: 1.5,
                              crossAxisSpacing: 8,
                              mainAxisSpacing: 8,
                            ),
                            itemCount: products.length,
                            itemBuilder: (_, i) => _ProductTile(
                                product: products[i], onTap: _addToCart),
                          ),
                  ),
                ),
              ],
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

class _CategoryRail extends ConsumerWidget {
  const _CategoryRail({required this.selectedId, required this.onSelect});

  final int? selectedId;
  final void Function(int?) onSelect;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoryProvider);
    final primaryColor = Theme.of(context).colorScheme.primary;

    final categories = categoriesAsync.valueOrNull ?? [];

    return Container(
      width: 72,
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        border: Border(right: BorderSide(color: Colors.grey.shade200)),
      ),
      child: ListView(
        padding: const EdgeInsets.symmetric(vertical: 4),
        children: [
          // "All" tile
          _CategoryTile(
            label: 'All',
            imageUrl: null,
            isSelected: selectedId == null,
            primaryColor: primaryColor,
            onTap: () => onSelect(null),
          ),
          ...categories.map((cat) => _CategoryTile(
                label: cat.name,
                imageUrl: cat.imageUrl,
                isSelected: selectedId == cat.id,
                primaryColor: primaryColor,
                onTap: () => onSelect(cat.id),
              )),
        ],
      ),
    );
  }
}

class _CategoryTile extends StatelessWidget {
  const _CategoryTile({
    required this.label,
    required this.imageUrl,
    required this.isSelected,
    required this.primaryColor,
    required this.onTap,
  });

  final String label;
  final String? imageUrl;
  final bool isSelected;
  final Color primaryColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 3),
        decoration: BoxDecoration(
          color: isSelected ? primaryColor.withOpacity(0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: isSelected
              ? Border.all(color: primaryColor, width: 1.5)
              : null,
        ),
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: imageUrl != null
                  ? Image.network(
                      imageUrl!,
                      width: 40,
                      height: 40,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _iconBox(primaryColor),
                    )
                  : _iconBox(primaryColor),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight:
                    isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? primaryColor : Colors.grey.shade700,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _iconBox(Color color) => Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: Colors.grey.shade200,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(Icons.label_outline, size: 20, color: Colors.grey.shade400),
      );
}

class _CartBar extends ConsumerWidget {
  const _CartBar({required this.cart});

  final CartState cart;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final primary = Theme.of(context).colorScheme.primary;
    return Container(
      color: primary,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Customer row
          InkWell(
            onTap: () => _showCustomerSearch(context, ref),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Row(children: [
                const Icon(Icons.person_outline,
                    color: Colors.white70, size: 16),
                const SizedBox(width: 6),
                Expanded(
                  child: cart.customer != null
                      ? Text(cart.customer!.name,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w500))
                      : const Text('Add customer (optional)',
                          style: TextStyle(
                              color: Colors.white60, fontSize: 12)),
                ),
                if (cart.customer != null)
                  GestureDetector(
                    onTap: () =>
                        ref.read(cartProvider.notifier).setCustomer(null),
                    child: const Icon(Icons.close,
                        color: Colors.white60, size: 16),
                  )
                else
                  const Icon(Icons.add, color: Colors.white60, size: 16),
              ]),
            ),
          ),
          // Total + checkout row
          Padding(
            padding:
                const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Row(children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('${cart.itemCount} item(s)',
                      style: const TextStyle(
                          color: Colors.white70, fontSize: 12)),
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
                  foregroundColor: primary,
                ),
                child: const Text('Checkout →'),
              ),
            ]),
          ),
        ],
      ),
    );
  }

  void _showCustomerSearch(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _CustomerSearchSheet(
        onSelect: (c) => ref.read(cartProvider.notifier).setCustomer(c),
      ),
    );
  }
}

// ── Inline customer search sheet (also used from PaymentScreen) ───────────────
class _CustomerSearchSheet extends StatefulWidget {
  const _CustomerSearchSheet({required this.onSelect});
  final void Function(CustomerModel) onSelect;

  @override
  State<_CustomerSearchSheet> createState() => _CustomerSearchSheetState();
}

class _CustomerSearchSheetState extends State<_CustomerSearchSheet> {
  final _ctrl = TextEditingController();
  List<CustomerModel> _results = [];
  bool _loading = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _search(String q) async {
    if (q.length < 2) {
      setState(() => _results = []);
      return;
    }
    setState(() => _loading = true);
    try {
      final list = await ApiService.getList('/customers',
          queryParameters: {'search': q, 'per_page': '15'});
      if (mounted) {
        setState(() => _results = list
            .map((e) =>
                CustomerModel.fromJson(e as Map<String, dynamic>))
            .toList());
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Row(children: [
            const Text('Select Customer',
                style:
                    TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const Spacer(),
            IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context)),
          ]),
          const SizedBox(height: 12),
          TextField(
            controller: _ctrl,
            autofocus: true,
            decoration: const InputDecoration(
              hintText: 'Search by name or phone...',
              prefixIcon: Icon(Icons.search),
              border: OutlineInputBorder(),
              isDense: true,
            ),
            onChanged: _search,
          ),
          const SizedBox(height: 8),
          if (_loading)
            const Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator())
          else
            ListView.builder(
              shrinkWrap: true,
              itemCount: _results.length,
              itemBuilder: (_, i) {
                final c = _results[i];
                return ListTile(
                  leading: CircleAvatar(child: Text(c.name[0])),
                  title: Text(c.name),
                  subtitle: Text(c.phone ?? c.email ?? ''),
                  onTap: () {
                    widget.onSelect(c);
                    Navigator.pop(context);
                  },
                );
              },
            ),
        ]),
      );
}
