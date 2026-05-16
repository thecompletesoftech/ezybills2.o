import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../core/models/invoice_model.dart';
import '../../core/providers/business_provider.dart';
import '../../core/providers/invoice_provider.dart';
import '../../core/services/api_service.dart';
import '../../core/widgets/currency_text.dart';
import '../../core/widgets/shimmer_list.dart';

class InvoiceDetailScreen extends ConsumerWidget {
  const InvoiceDetailScreen({super.key, required this.invoiceId});

  final int invoiceId;

  Future<void> _printInvoice(
      BuildContext context, WidgetRef ref, InvoiceModel invoice) async {
    final business = ref.read(businessProvider).valueOrNull;

    // Load printer settings for paper size
    Map<String, dynamic> settings = {};
    try {
      final resp = await ApiService.get('/settings/printer');
      settings = resp['data'] as Map<String, dynamic>? ?? resp;
    } catch (_) {}

    final paperSize = settings['paper_size'] as String? ?? '80mm';
    final printGst = (settings['print_gst'] as bool?) ?? true;
    final printFooter = (settings['print_footer'] as bool?) ?? true;
    final footerText = settings['footer_text'] as String? ??
        'Thank you for your business!';
    final printAddress = (settings['print_address'] as bool?) ?? true;
    final printMobile = (settings['print_mobile'] as bool?) ?? true;

    final isA4 = paperSize == 'A4';
    final pageFormat = isA4
        ? PdfPageFormat.a4
        : PdfPageFormat(
            paperSize == '58mm' ? 58 * PdfPageFormat.mm : 80 * PdfPageFormat.mm,
            double.infinity,
            marginAll: 4 * PdfPageFormat.mm,
          );

    final doc = pw.Document();
    final fmt = NumberFormat.currency(locale: 'en_IN', symbol: '₹');

    doc.addPage(pw.Page(
      pageFormat: pageFormat,
      build: (ctx) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Center(
            child: pw.Text(
              business?.name ?? 'EzyBills',
              style: pw.TextStyle(
                  fontSize: isA4 ? 18 : 14,
                  fontWeight: pw.FontWeight.bold),
            ),
          ),
          if (printAddress && business?.address != null)
            pw.Center(
              child: pw.Text(business!.address!,
                  style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
            ),
          if (printMobile && business?.mobileNumber != null)
            pw.Center(
              child: pw.Text('Ph: ${business!.mobileNumber}',
                  style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
            ),
          if (business?.gstNumber != null)
            pw.Center(
              child: pw.Text('GSTIN: ${business!.gstNumber}',
                  style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
            ),
          pw.Divider(),
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text('Invoice: ${invoice.invoiceNumber}',
                  style: pw.TextStyle(
                      fontSize: isA4 ? 11 : 9,
                      fontWeight: pw.FontWeight.bold)),
              pw.Text(
                invoice.invoiceDate.toString().split(' ').first,
                style: pw.TextStyle(fontSize: isA4 ? 10 : 8),
              ),
            ],
          ),
          if (invoice.customerName != null)
            pw.Text('Customer: ${invoice.customerName}',
                style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
          pw.Divider(),
          ...invoice.items.map((item) => pw.Row(
                children: [
                  pw.Expanded(
                    child: pw.Text(
                      '${item.productName}\n${item.quantity.toInt()} x ${fmt.format(item.unitPrice)}',
                      style: pw.TextStyle(fontSize: isA4 ? 10 : 8),
                    ),
                  ),
                  pw.Text(fmt.format(item.total),
                      style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
                ],
              )),
          pw.Divider(),
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text('Subtotal',
                  style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
              pw.Text(fmt.format(invoice.subtotal),
                  style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
            ],
          ),
          if (invoice.discountAmount > 0)
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('Discount',
                    style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
                pw.Text('-${fmt.format(invoice.discountAmount)}',
                    style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
              ],
            ),
          if (printGst && invoice.taxAmount > 0)
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('GST',
                    style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
                pw.Text(fmt.format(invoice.taxAmount),
                    style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
              ],
            ),
          pw.Divider(),
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text('TOTAL',
                  style: pw.TextStyle(
                      fontSize: isA4 ? 13 : 11,
                      fontWeight: pw.FontWeight.bold)),
              pw.Text(fmt.format(invoice.totalAmount),
                  style: pw.TextStyle(
                      fontSize: isA4 ? 13 : 11,
                      fontWeight: pw.FontWeight.bold)),
            ],
          ),
          if (invoice.dueAmount > 0)
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('Due',
                    style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
                pw.Text(fmt.format(invoice.dueAmount),
                    style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
              ],
            ),
          if (printFooter) ...[
            pw.Divider(),
            pw.Center(
              child: pw.Text(footerText,
                  style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
            ),
          ],
        ],
      ),
    ));

    await Printing.layoutPdf(
      onLayout: (_) async => doc.save(),
      name: invoice.invoiceNumber,
    );
  }

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
          IconButton(
            icon: const Icon(Icons.print),
            onPressed: () async {
              final invoice =
                  await ref.read(invoiceProvider.notifier).getById(invoiceId);
              if (invoice != null && context.mounted) {
                await _printInvoice(context, ref, invoice);
              }
            },
          ),
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
