import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/invoice_model.dart';
import '../../core/providers/invoice_provider.dart';
import '../../core/services/api_service.dart';
import '../../core/widgets/currency_text.dart';
import '../../core/widgets/shimmer_list.dart';

class InvoiceDetailScreen extends ConsumerWidget {
  const InvoiceDetailScreen({super.key, required this.invoiceId});

  final int invoiceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Invoice'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () async {
              try {
                await ApiService.post(
                    '/invoices/$invoiceId/whatsapp', data: {});
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Sent on WhatsApp')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(e.toString())),
                  );
                }
              }
            },
          ),
          IconButton(icon: const Icon(Icons.print), onPressed: () {}),
        ],
      ),
      body: FutureBuilder<InvoiceModel?>(
        future: ref.read(invoiceProvider.notifier).getById(invoiceId),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const ShimmerList(itemCount: 4);
          }
          final invoice = snap.data;
          if (invoice == null) {
            return const Center(child: Text('Invoice not found'));
          }
          return _InvoiceBody(invoice: invoice);
        },
      ),
    );
  }
}

class _InvoiceBody extends StatelessWidget {
  const _InvoiceBody({required this.invoice});

  final InvoiceModel invoice;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(invoice.invoiceNumber,
                      style: theme.textTheme.titleLarge
                          ?.copyWith(fontWeight: FontWeight.bold)),
                  Text(invoice.invoiceDate.toString().split(' ').first,
                      style: const TextStyle(color: Colors.grey)),
                ],
              ),
              _StatusChip(invoice.paymentStatus),
            ],
          ),

          if (invoice.customerName != null) ...[
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.person_outline),
              title: Text(invoice.customerName!),
              dense: true,
            ),
          ],

          const Divider(height: 24),
          Text('Items',
              style: theme.textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ...invoice.items.map((item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.productName,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w500)),
                          Text(
                              '${item.quantity.toInt()} × ${formatCurrency(item.unitPrice)}',
                              style: const TextStyle(
                                  fontSize: 12, color: Colors.grey)),
                        ],
                      ),
                    ),
                    CurrencyText(item.total),
                  ],
                ),
              )),

          const Divider(height: 24),
          _TotalRow('Subtotal', invoice.subtotal),
          if (invoice.taxAmount > 0)
            _TotalRow('Tax', invoice.taxAmount),
          if (invoice.discountAmount > 0)
            _TotalRow('Discount', -invoice.discountAmount,
                color: Colors.green),
          const Divider(),
          _TotalRow('Total', invoice.totalAmount,
              bold: true, color: theme.colorScheme.primary),
          if (invoice.dueAmount > 0)
            _TotalRow('Due', invoice.dueAmount, color: Colors.red),
        ],
      ),
    );
  }
}

class _TotalRow extends StatelessWidget {
  const _TotalRow(this.label, this.amount,
      {this.bold = false, this.color});

  final String label;
  final double amount;
  final bool bold;
  final Color? color;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
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

class _StatusChip extends StatelessWidget {
  const _StatusChip(this.status);

  final String status;

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status) {
      case 'paid':
        color = Colors.green;
      case 'partially_paid':
        color = Colors.orange;
      default:
        color = Colors.red;
    }
    return Chip(
      label: Text(status.replaceAll('_', ' ').toUpperCase(),
          style: const TextStyle(color: Colors.white, fontSize: 11)),
      backgroundColor: color,
      padding: EdgeInsets.zero,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }
}
