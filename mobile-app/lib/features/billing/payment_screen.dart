import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../core/models/customer_model.dart';
import '../../core/models/invoice_model.dart';
import '../../core/providers/business_provider.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/services/api_service.dart';
import '../../core/widgets/currency_text.dart';

class PaymentScreen extends ConsumerStatefulWidget {
  const PaymentScreen({super.key});

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  String _method = 'cash';
  final _cashCtrl = TextEditingController();
  final _discountCtrl = TextEditingController(text: '0');
  bool _loading = false;
  InvoiceModel? _done;
  String? _upiId;
  bool _printUpiQr = false;

  @override
  void initState() {
    super.initState();
    _loadPrinterSettings();
  }

  Future<void> _loadPrinterSettings() async {
    try {
      final resp = await ApiService.get('/settings/printer');
      final s = resp['data'] as Map<String, dynamic>? ?? resp;
      if (mounted) {
        setState(() {
          _upiId = s['upi_id'] as String?;
          _printUpiQr = (s['print_upi_qr'] as bool?) ?? false;
        });
      }
    } catch (_) {}
  }

  static const _methods = [
    ('cash', 'Cash', Icons.money),
    ('card', 'Card', Icons.credit_card),
    ('upi', 'UPI', Icons.qr_code),
    ('split', 'Split', Icons.call_split),
  ];

  @override
  void dispose() {
    _cashCtrl.dispose();
    _discountCtrl.dispose();
    super.dispose();
  }

  double get _discountPct =>
      (double.tryParse(_discountCtrl.text) ?? 0).clamp(0, 100);
  double get _cashPaid => double.tryParse(_cashCtrl.text) ?? 0;

  double _rawSubtotal(CartState cart) =>
      cart.items.fold(0.0, (s, i) => s + i.unitPrice * i.quantity);

  double _discountAmt(CartState cart) =>
      _rawSubtotal(cart) * _discountPct / 100;

  // Apply discount BEFORE tax — identical to the web POS formula.
  // taxableBase = price * qty * (1 - discPct/100), then add/extract GST.
  double _grandTotal(CartState cart) => cart.items.fold(0, (sum, item) {
        final base = item.unitPrice * item.quantity;
        final taxable = base * (1 - _discountPct / 100);
        if (item.taxType == 'inclusive') return sum + taxable;
        return sum + taxable + taxable * item.taxPercentage / 100;
      });

  double _taxDisplay(CartState cart) => cart.items.fold(0, (sum, item) {
        final base = item.unitPrice * item.quantity;
        final taxable = base * (1 - _discountPct / 100);
        if (item.taxType == 'inclusive') {
          return item.taxPercentage > 0
              ? sum + taxable * item.taxPercentage / (100 + item.taxPercentage)
              : sum;
        }
        return sum + taxable * item.taxPercentage / 100;
      });

  Future<void> _submit({required String status}) async {
    if (_loading) return;
    final cart = ref.read(cartProvider);
    if (cart.isEmpty) return;

    final total = _grandTotal(cart);
    if (status == 'paid' && _method == 'cash' && _cashPaid > 0 &&
        _cashPaid < total) {
      _snack('Cash received is less than total', isError: true);
      return;
    }

    setState(() => _loading = true);
    try {
      // 'split' is not in the backend enum (cash,card,upi,credit,mixed)
      final backendMode = _method == 'split' ? 'mixed' : _method;
      final payload = {
        ...cart.toInvoicePayload(discountPct: _discountPct),
        'payment_mode': backendMode,
        'payment_status': status,
      };

      final res = await ApiService.post('/invoices', data: payload);
      final invoice = InvoiceModel.fromJson(
          (res['data'] as Map<String, dynamic>?) ?? res);
      ref.read(cartProvider.notifier).clear();

      if (!mounted) return;
      if (status == 'hold') {
        Navigator.pop(context);
        _snack('Invoice held');
      } else {
        setState(() => _done = invoice);
      }
    } catch (e) {
      if (mounted) _snack(e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _snack(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: isError ? Colors.red : null,
    ));
  }

  Future<void> _print(InvoiceModel invoice) async {
    final business = ref.read(businessProvider).valueOrNull;
    Map<String, dynamic> settings = {};
    try {
      final resp = await ApiService.get('/settings/printer');
      settings = resp['data'] as Map<String, dynamic>? ?? resp;
    } catch (_) {}

    final paperSize = settings['paper_size'] as String? ?? '80mm';
    final printGst = (settings['print_gst'] as bool?) ?? true;
    final footerText =
        settings['footer_text'] as String? ?? 'Thank you for your business!';
    final printFooter = (settings['print_footer'] as bool?) ?? true;

    final isA4 = paperSize == 'A4';
    final pageFormat = isA4
        ? PdfPageFormat.a4
        : PdfPageFormat(
            paperSize == '58mm'
                ? 58 * PdfPageFormat.mm
                : 80 * PdfPageFormat.mm,
            double.infinity,
            marginAll: 4 * PdfPageFormat.mm,
          );
    final fmt = NumberFormat.currency(locale: 'en_IN', symbol: '₹');
    final doc = pw.Document();
    doc.addPage(pw.Page(
      pageFormat: pageFormat,
      build: (ctx) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Center(
              child: pw.Text(business?.name ?? 'EzyBills',
                  style: pw.TextStyle(
                      fontSize: isA4 ? 18 : 14,
                      fontWeight: pw.FontWeight.bold))),
          if (business?.address != null)
            pw.Center(
                child: pw.Text(business!.address!,
                    style: pw.TextStyle(fontSize: isA4 ? 10 : 8))),
          if (business?.mobileNumber != null)
            pw.Center(
                child: pw.Text('Ph: ${business!.mobileNumber}',
                    style: pw.TextStyle(fontSize: isA4 ? 10 : 8))),
          if (business?.gstNumber != null)
            pw.Center(
                child: pw.Text('GSTIN: ${business!.gstNumber}',
                    style: pw.TextStyle(fontSize: isA4 ? 10 : 8))),
          pw.Divider(),
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text('Invoice: ${invoice.invoiceNumber}',
                  style: pw.TextStyle(
                      fontSize: isA4 ? 11 : 9,
                      fontWeight: pw.FontWeight.bold)),
              pw.Text(invoice.invoiceDate.toString().split(' ').first,
                  style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
            ],
          ),
          if (invoice.customerName != null)
            pw.Text('Customer: ${invoice.customerName}',
                style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
          pw.Divider(),
          ...invoice.items.map((item) => pw.Row(children: [
                pw.Expanded(
                    child: pw.Text(
                        '${item.productName}\n${item.quantity.toInt()} x ${fmt.format(item.unitPrice)}',
                        style: pw.TextStyle(fontSize: isA4 ? 10 : 8))),
                pw.Text(fmt.format(item.total),
                    style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
              ])),
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
            pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Discount',
                      style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
                  pw.Text('-${fmt.format(invoice.discountAmount)}',
                      style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
                ]),
          if (printGst && invoice.taxAmount > 0)
            pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('GST',
                      style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
                  pw.Text(fmt.format(invoice.taxAmount),
                      style: pw.TextStyle(fontSize: isA4 ? 10 : 8)),
                ]),
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
          if (printFooter) ...[
            pw.Divider(),
            pw.Center(
                child: pw.Text(footerText,
                    style: pw.TextStyle(fontSize: isA4 ? 10 : 8))),
          ],
        ],
      ),
    ));
    await Printing.layoutPdf(
        onLayout: (_) async => doc.save(), name: invoice.invoiceNumber);
  }

  Future<void> _whatsapp(InvoiceModel invoice) async {
    try {
      await ApiService.post('/invoices/${invoice.id}/whatsapp', data: {});
      _snack('Sent on WhatsApp');
    } catch (e) {
      _snack(e.toString(), isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;

    // ── Success screen ───────────────────────────────────────────────────────
    if (_done != null) {
      final inv = _done!;
      return Scaffold(
        appBar: AppBar(title: const Text('Sale Complete')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                      color: Colors.green.shade100, shape: BoxShape.circle),
                  child: Icon(Icons.check_circle_rounded,
                      size: 52, color: Colors.green.shade600),
                ),
                const SizedBox(height: 20),
                Text('Payment Successful!',
                    style: theme.textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(inv.invoiceNumber,
                    style: const TextStyle(color: Colors.grey)),
                const SizedBox(height: 4),
                Text(
                  formatCurrency(inv.totalAmount),
                  style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: primary),
                ),
                const SizedBox(height: 32),
                Row(children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _print(inv),
                      icon: const Icon(Icons.print),
                      label: const Text('Print'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _whatsapp(inv),
                      icon: const Icon(Icons.share),
                      label: const Text('WhatsApp'),
                    ),
                  ),
                ]),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      // Cart already cleared; just pop back to POS
                      Navigator.popUntil(context, (r) => r.isFirst);
                    },
                    icon: const Icon(Icons.add_shopping_cart),
                    label: const Text('New Sale'),
                    style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14)),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // ── Payment form ─────────────────────────────────────────────────────────
    final subtotal = _rawSubtotal(cart);
    final discAmt = _discountAmt(cart);
    final taxAmt = _taxDisplay(cart);
    final total = _grandTotal(cart);
    final change =
        _method == 'cash' ? (_cashPaid - total).clamp(0.0, double.infinity) : 0.0;

    return Scaffold(
      appBar: AppBar(title: const Text('Payment')),
      body: SingleChildScrollView(
        padding: EdgeInsets.only(
          left: 16, right: 16, top: 16,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Bill summary ────────────────────────────────────────────────
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(children: [
                  _BillRow('Subtotal', subtotal),
                  if (discAmt > 0)
                    _BillRow('Discount (${_discountPct.toStringAsFixed(0)}%)',
                        -discAmt, color: Colors.green),
                  if (taxAmt > 0) _BillRow('GST', taxAmt),
                  const Divider(),
                  _BillRow('Total', total,
                      bold: true, color: primary),
                ]),
              ),
            ),
            const SizedBox(height: 12),

            // ── Discount ────────────────────────────────────────────────────
            Row(children: [
              const Icon(Icons.discount_outlined, size: 18, color: Colors.grey),
              const SizedBox(width: 8),
              const Text('Discount %',
                  style: TextStyle(fontWeight: FontWeight.w500)),
              const SizedBox(width: 12),
              SizedBox(
                width: 80,
                child: TextField(
                  controller: _discountCtrl,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))
                  ],
                  decoration: const InputDecoration(
                    suffixText: '%',
                    isDense: true,
                    border: OutlineInputBorder(),
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              if (discAmt > 0) ...[
                const SizedBox(width: 8),
                Text('= ${formatCurrency(discAmt)}',
                    style: const TextStyle(
                        color: Colors.green, fontWeight: FontWeight.w500)),
              ],
            ]),
            const SizedBox(height: 12),

            // ── Customer ────────────────────────────────────────────────────
            GestureDetector(
              onTap: () => _showCustomerSearch(context),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(children: [
                  const Icon(Icons.person_outline, size: 20, color: Colors.grey),
                  const SizedBox(width: 8),
                  Expanded(
                    child: cart.customer != null
                        ? Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(cart.customer!.name,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w500)),
                              if (cart.customer!.phone != null)
                                Text(cart.customer!.phone!,
                                    style: const TextStyle(
                                        fontSize: 12, color: Colors.grey)),
                            ],
                          )
                        : const Text('Add customer (optional)',
                            style: TextStyle(color: Colors.grey)),
                  ),
                  if (cart.customer != null)
                    GestureDetector(
                      onTap: () =>
                          ref.read(cartProvider.notifier).setCustomer(null),
                      child: const Icon(Icons.close,
                          size: 18, color: Colors.grey),
                    )
                  else
                    const Icon(Icons.chevron_right, color: Colors.grey),
                ]),
              ),
            ),
            const SizedBox(height: 16),

            // ── Payment method ──────────────────────────────────────────────
            Text('Payment Method',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
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
                        color: selected ? primary : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(children: [
                        Icon(m.$3,
                            color: selected ? Colors.white : Colors.grey,
                            size: 20),
                        const SizedBox(height: 4),
                        Text(m.$2,
                            style: TextStyle(
                                fontSize: 11,
                                color: selected ? Colors.white : Colors.black,
                                fontWeight: FontWeight.w500)),
                      ]),
                    ),
                  ),
                );
              }).toList(),
            ),

            // ── UPI QR ──────────────────────────────────────────────────────
            if (_method == 'upi') ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.purple.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.purple.shade200),
                ),
                child: Column(
                  children: [
                    Text(
                      'UPI Payment — ${formatCurrency(total)}',
                      style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.purple.shade700),
                    ),
                    const SizedBox(height: 12),
                    if (_upiId != null && _upiId!.isNotEmpty) ...[
                      QrImageView(
                        data: 'upi://pay?pa=${Uri.encodeComponent(_upiId!)}'
                            '&pn=${Uri.encodeComponent(ref.read(businessProvider).valueOrNull?.name ?? "EzyBills")}'
                            '&am=${total.toStringAsFixed(2)}&cu=INR',
                        version: QrVersions.auto,
                        size: 160,
                      ),
                      const SizedBox(height: 6),
                      Text(_upiId!,
                          style: TextStyle(
                              fontSize: 12, color: Colors.purple.shade600)),
                      Text('Scan QR to pay',
                          style: TextStyle(
                              fontSize: 11, color: Colors.purple.shade400)),
                    ] else
                      Text(
                        'Collect ${formatCurrency(total)} via UPI.\nAdd your UPI ID in Printer Settings to show QR.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 12, color: Colors.purple.shade500),
                      ),
                  ],
                ),
              ),
            ],

            // ── Cash input ──────────────────────────────────────────────────
            if (_method == 'cash') ...[
              const SizedBox(height: 16),
              TextField(
                controller: _cashCtrl,
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
              if (_cashPaid >= total && change > 0) ...[
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
                      const Text('Change to return',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      CurrencyText(change,
                          bold: true, color: Colors.green.shade700),
                    ],
                  ),
                ),
              ],
              if (_cashPaid > 0 && _cashPaid < total) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Short by',
                          style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: Colors.red)),
                      CurrencyText(total - _cashPaid,
                          bold: true, color: Colors.red),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 8),
              // Quick amounts
              Wrap(
                spacing: 6,
                children: [100, 200, 500, 1000].map((amt) {
                  return ActionChip(
                    label: Text('₹$amt'),
                    onPressed: () {
                      _cashCtrl.text = amt.toString();
                      setState(() {});
                    },
                  );
                }).toList()
                  ..add(ActionChip(
                    label: const Text('Exact'),
                    onPressed: () {
                      _cashCtrl.text = total.toStringAsFixed(2);
                      setState(() {});
                    },
                  )),
              ),
            ],

            const SizedBox(height: 24),

            // ── Action buttons ──────────────────────────────────────────────
            Row(children: [
              Expanded(
                child: OutlinedButton(
                  onPressed:
                      _loading ? null : () => _submit(status: 'hold'),
                  child: const Text('Hold'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed:
                      _loading ? null : () => _submit(status: 'paid'),
                  style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14)),
                  child: _loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : Text('Charge ${formatCurrency(total)}',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }

  void _showCustomerSearch(BuildContext context) {
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

// ── Customer search bottom sheet ─────────────────────────────────────────────
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
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16, right: 16, top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Row(children: [
          const Text('Select Customer',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
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
            child: CircularProgressIndicator(),
          )
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
}

// ── Helpers ───────────────────────────────────────────────────────────────────
String formatCurrency(double v) =>
    NumberFormat.currency(locale: 'en_IN', symbol: '₹').format(v);

class _BillRow extends StatelessWidget {
  const _BillRow(this.label, this.amount, {this.bold = false, this.color});
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
