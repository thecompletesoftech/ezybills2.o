import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/product_model.dart';
import '../../core/services/api_service.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/app_text_field.dart';

class StockAdjustmentScreen extends ConsumerStatefulWidget {
  const StockAdjustmentScreen({super.key, required this.product});

  final ProductModel product;

  @override
  ConsumerState<StockAdjustmentScreen> createState() =>
      _StockAdjustmentScreenState();
}

class _StockAdjustmentScreenState
    extends ConsumerState<StockAdjustmentScreen> {
  final _quantityController = TextEditingController();
  final _reasonController = TextEditingController();
  String _type = 'in';
  bool _loading = false;

  @override
  void dispose() {
    _quantityController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final qty = double.tryParse(_quantityController.text);
    if (qty == null || qty <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid quantity')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      await ApiService.post('/stock/adjust', data: {
        'product_id': widget.product.id,
        'type': _type,
        'quantity': qty,
        'reason': _reasonController.text.trim(),
      });
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Stock updated')),
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
        appBar: AppBar(
            title:
                Text('Stock Adjustment — ${widget.product.name}')),
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Card(
                child: ListTile(
                  title: Text(widget.product.name,
                      style:
                          const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: const Text('Current Stock'),
                  trailing: Text(
                    widget.product.currentStock.toInt().toString(),
                    style: const TextStyle(
                        fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _type = 'in'),
                      child: Container(
                        padding:
                            const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: _type == 'in'
                              ? Colors.green
                              : Colors.grey.shade200,
                          borderRadius: const BorderRadius.horizontal(
                              left: Radius.circular(8)),
                        ),
                        child: Text('Stock In',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                color: _type == 'in'
                                    ? Colors.white
                                    : Colors.black,
                                fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _type = 'out'),
                      child: Container(
                        padding:
                            const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: _type == 'out'
                              ? Colors.red
                              : Colors.grey.shade200,
                          borderRadius: const BorderRadius.horizontal(
                              right: Radius.circular(8)),
                        ),
                        child: Text('Stock Out',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                color: _type == 'out'
                                    ? Colors.white
                                    : Colors.black,
                                fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              AppTextField(
                label: 'Quantity',
                controller: _quantityController,
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))
                ],
              ),
              const SizedBox(height: 12),
              AppTextField(
                label: 'Reason (optional)',
                controller: _reasonController,
                maxLines: 2,
              ),
              const SizedBox(height: 24),
              AppButton(
                label: 'Update Stock',
                onPressed: _submit,
                loading: _loading,
                color: _type == 'in' ? Colors.green : Colors.red,
              ),
            ],
          ),
        ),
      );
}
