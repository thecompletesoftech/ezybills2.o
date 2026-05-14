import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/product_provider.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/app_text_field.dart';

class ProductFormScreen extends ConsumerStatefulWidget {
  const ProductFormScreen({super.key, this.productId});

  final int? productId;

  @override
  ConsumerState<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends ConsumerState<ProductFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _skuController = TextEditingController();
  final _barcodeController = TextEditingController();
  final _salePriceController = TextEditingController();
  final _purchasePriceController = TextEditingController();
  final _gstController = TextEditingController(text: '0');
  final _stockController = TextEditingController(text: '0');
  final _minStockController = TextEditingController(text: '0');

  bool _loading = false;
  bool get _isEdit => widget.productId != null;

  @override
  void dispose() {
    _nameController.dispose();
    _skuController.dispose();
    _barcodeController.dispose();
    _salePriceController.dispose();
    _purchasePriceController.dispose();
    _gstController.dispose();
    _stockController.dispose();
    _minStockController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final data = {
        'name': _nameController.text.trim(),
        'sku': _skuController.text.trim(),
        'barcode': _barcodeController.text.trim(),
        'sale_price': double.parse(_salePriceController.text),
        'purchase_price': double.parse(_purchasePriceController.text),
        'gst_percentage': double.tryParse(_gstController.text) ?? 0,
        'opening_stock': double.tryParse(_stockController.text) ?? 0,
        'minimum_stock': double.tryParse(_minStockController.text) ?? 0,
      };
      if (_isEdit) {
        await ref
            .read(productProvider.notifier)
            .updateProduct(widget.productId!, data);
      } else {
        await ref.read(productProvider.notifier).create(data);
      }
      if (mounted) Navigator.pop(context);
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
            title: Text(_isEdit ? 'Edit Product' : 'Add Product')),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                AppTextField(
                  label: 'Product Name *',
                  controller: _nameController,
                  validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                        child: AppTextField(
                            label: 'SKU', controller: _skuController)),
                    const SizedBox(width: 12),
                    Expanded(
                        child: AppTextField(
                            label: 'Barcode',
                            controller: _barcodeController,
                            keyboardType: TextInputType.number)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: AppTextField(
                        label: 'Sale Price (₹) *',
                        controller: _salePriceController,
                        keyboardType: const TextInputType.numberWithOptions(
                            decimal: true),
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))
                        ],
                        validator: (v) =>
                            v == null || v.isEmpty ? 'Required' : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: AppTextField(
                        label: 'Purchase Price (₹)',
                        controller: _purchasePriceController,
                        keyboardType: const TextInputType.numberWithOptions(
                            decimal: true),
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: AppTextField(
                        label: 'GST %',
                        controller: _gstController,
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: AppTextField(
                        label: 'Opening Stock',
                        controller: _stockController,
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: AppTextField(
                        label: 'Min Stock',
                        controller: _minStockController,
                        keyboardType: TextInputType.number,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                AppButton(
                  label: _isEdit ? 'Update Product' : 'Add Product',
                  onPressed: _submit,
                  loading: _loading,
                ),
              ],
            ),
          ),
        ),
      );
}
