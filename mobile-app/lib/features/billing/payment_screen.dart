import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/providers/invoice_provider.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/currency_text.dart';
import 'invoice_detail_screen.dart';

class PaymentScreen extends ConsumerStatefulWidget {
  const PaymentScreen({super.key});

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  String _method = 'cash';
  final _cashController = TextEditingController();
  bool _loading = false;

  static const _methods = [
    ('cash', 'Cash', Icons.money),
    ('card', 'Card', Icons.credit_card),
    ('upi', 'UPI', Icons.qr_code),
    ('split', 'Split', Icons.call_split),
  ];

  @override
  void dispose() {
    _cashController.dispose();
    super.dispose();
  }

  double get _cashPaid =>
      double.tryParse(_cashController.text) ?? 0;

  Future<void> _charge() async {
    final cart = ref.read(cartProvider);
    if (_method == 'cash' && _cashPaid < cart.total) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cash amount is less than total')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      final invoice = await ref.read(invoiceProvider.notifier).createFromCart(
        ref,
        {
          'payment_method': _method,
          'paid_amount': cart.total,
          'payment_status': 'paid',
          'invoice_status': 'completed',
        },
      );
      if (!mounted) return;
      if (invoice != null) {
        await Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => InvoiceDetailScreen(invoiceId: invoice.id),
          ),
        );
      } else {
        // Saved offline
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Invoice saved offline. Will sync when online.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final theme = Theme.of(context);
    final change =
        _method == 'cash' ? (_cashPaid - cart.total).clamp(0.0, double.infinity) : 0.0;

    return Scaffold(
      appBar: AppBar(title: const Text('Payment')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Bill summary
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _BillRow('Subtotal', cart.subtotal),
                    if (cart.taxTotal > 0)
                      _BillRow('Tax', cart.taxTotal),
                    if (cart.discountAmount > 0 || cart.itemDiscountTotal > 0)
                      _BillRow('Discount',
                          -(cart.discountAmount + cart.itemDiscountTotal),
                          color: Colors.green),
                    const Divider(),
                    _BillRow('Total', cart.total,
                        bold: true, color: theme.colorScheme.primary),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Customer
            if (cart.customer != null)
              ListTile(
                leading: const Icon(Icons.person),
                title: Text(cart.customer!.name),
                subtitle: Text(cart.customer!.phone ?? ''),
                trailing: IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () =>
                      ref.read(cartProvider.notifier).setCustomer(null),
                ),
                tileColor: Colors.grey.shade100,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8)),
              ),

            const SizedBox(height: 16),
            Text('Payment Method',
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              children: _methods.map((m) {
                final selected = _method == m.$1;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _method = m.$1),
                    child: Container(
                      margin: const EdgeInsets.only(right: 6),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: selected
                            ? theme.colorScheme.primary
                            : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        children: [
                          Icon(m.$3,
                              color: selected ? Colors.white : Colors.grey,
                              size: 20),
                          const SizedBox(height: 4),
                          Text(m.$2,
                              style: TextStyle(
                                  fontSize: 11,
                                  color: selected ? Colors.white : Colors.black,
                                  fontWeight: FontWeight.w500)),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),

            if (_method == 'cash') ...[
              const SizedBox(height: 16),
              TextField(
                controller: _cashController,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))
                ],
                decoration: const InputDecoration(
                  labelText: 'Cash Received (₹)',
                  border: OutlineInputBorder(),
                  prefixText: '₹ ',
                ),
                onChanged: (_) => setState(() {}),
              ),
              if (_cashPaid >= cart.total && change > 0) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Change to Return',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      CurrencyText(change,
                          bold: true, color: Colors.green.shade700),
                    ],
                  ),
                ),
              ],
            ],

            const SizedBox(height: 24),
            AppButton(
              label: 'Charge ${formatCurrency(cart.total)}',
              onPressed: _charge,
              loading: _loading,
            ),
          ],
        ),
      ),
    );
  }
}

class _BillRow extends StatelessWidget {
  const _BillRow(this.label, this.amount,
      {this.bold = false, this.color});

  final String label;
  final double amount;
  final bool bold;
  final Color? color;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label,
                style: TextStyle(
                    fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
            CurrencyText(amount, bold: bold, color: color),
          ],
        ),
      );
}
