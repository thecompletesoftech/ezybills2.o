import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/customer_model.dart';
import '../../core/providers/customer_provider.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/currency_text.dart';

class RecordPaymentScreen extends ConsumerStatefulWidget {
  const RecordPaymentScreen({super.key, required this.customer});

  final CustomerModel customer;

  @override
  ConsumerState<RecordPaymentScreen> createState() =>
      _RecordPaymentScreenState();
}

class _RecordPaymentScreenState extends ConsumerState<RecordPaymentScreen> {
  final _amountController = TextEditingController();
  String _method = 'cash';
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _amountController.text = widget.customer.dueAmount.toStringAsFixed(2);
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amountController.text);
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid amount')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      await ref
          .read(customerProvider.notifier)
          .recordPayment(widget.customer.id, amount, _method);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment recorded')),
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
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Collect Payment')),
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Card(
                child: ListTile(
                  title: Text(widget.customer.name,
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: const Text('Due Amount'),
                  trailing: CurrencyText(widget.customer.dueAmount,
                      bold: true, color: Colors.red),
                ),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _amountController,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))
                ],
                decoration: const InputDecoration(
                  labelText: 'Amount to Collect (₹)',
                  border: OutlineInputBorder(),
                  prefixText: '₹ ',
                ),
              ),
              const SizedBox(height: 16),
              const Text('Payment Method',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: ['cash', 'card', 'upi', 'bank_transfer']
                    .map((m) => ChoiceChip(
                          label: Text(m.replaceAll('_', ' ').toUpperCase()),
                          selected: _method == m,
                          onSelected: (_) => setState(() => _method = m),
                        ))
                    .toList(),
              ),
              const SizedBox(height: 24),
              AppButton(
                  label: 'Record Payment',
                  onPressed: _submit,
                  loading: _loading),
            ],
          ),
        ),
      );
}
