import 'dart:io';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/product_provider.dart';
import '../../core/providers/supplier_provider.dart';
import '../../core/services/api_service.dart';
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
  final _lowStockController = TextEditingController(text: '0');
  final _descController = TextEditingController();

  bool _loading = false;
  bool _imageLoading = false;
  File? _imageFile;
  String? _existingImageUrl;
  int? _selectedSupplierId;

  bool get _isEdit => widget.productId != null;

  @override
  void initState() {
    super.initState();
    if (_isEdit) _loadProduct();
  }

  Future<void> _loadProduct() async {
    try {
      final response = await ApiService.get('/products/${widget.productId}');
      if (!mounted) return;
      final data = response['data'] as Map<String, dynamic>? ?? response;
      setState(() {
        _nameController.text = data['name'] as String? ?? '';
        _skuController.text = data['sku'] as String? ?? '';
        _barcodeController.text = data['barcode'] as String? ?? '';
        _salePriceController.text = '${data['sale_price'] ?? ''}';
        _purchasePriceController.text = '${data['purchase_price'] ?? ''}';
        _gstController.text = '${data['gst_percentage'] ?? 0}';
        _lowStockController.text = '${data['low_stock_threshold'] ?? 0}';
        _descController.text = data['description'] as String? ?? '';
        _existingImageUrl = data['image_url'] as String?;
      });
    } catch (_) {}
  }

  Future<void> _pickImage() async {
    setState(() => _imageLoading = true);
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: false,
      );
      if (result != null && result.files.single.path != null) {
        setState(() {
          _imageFile = File(result.files.single.path!);
          _existingImageUrl = null;
        });
      }
    } finally {
      if (mounted) setState(() => _imageLoading = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final data = <String, dynamic>{
        'name': _nameController.text.trim(),
        'sku': _skuController.text.trim(),
        'barcode': _barcodeController.text.trim(),
        'sale_price': double.parse(_salePriceController.text),
        'purchase_price':
            double.tryParse(_purchasePriceController.text) ?? 0.0,
        'gst_percentage': double.tryParse(_gstController.text) ?? 0.0,
        'opening_stock': double.tryParse(_stockController.text) ?? 0.0,
        'low_stock_threshold':
            double.tryParse(_lowStockController.text) ?? 0.0,
        'description': _descController.text.trim(),
        if (_selectedSupplierId != null) 'supplier_id': _selectedSupplierId,
      };
      if (_imageFile != null) {
        data['image'] = await MultipartFile.fromFile(
          _imageFile!.path,
          filename: 'product.jpg',
        );
      }
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
  void dispose() {
    _nameController.dispose();
    _skuController.dispose();
    _barcodeController.dispose();
    _salePriceController.dispose();
    _purchasePriceController.dispose();
    _gstController.dispose();
    _stockController.dispose();
    _lowStockController.dispose();
    _descController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final suppliersAsync = ref.watch(supplierProvider);
    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Edit Product' : 'Add Product')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _ImagePicker(
                imageFile: _imageFile,
                existingUrl: _existingImageUrl,
                loading: _imageLoading,
                onTap: _pickImage,
                onRemove: () => setState(() {
                  _imageFile = null;
                  _existingImageUrl = null;
                }),
              ),
              const SizedBox(height: 16),
              AppTextField(
                label: 'Product Name *',
                controller: _nameController,
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              AppTextField(
                label: 'Description',
                controller: _descController,
                maxLines: 2,
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
                  if (!_isEdit)
                    Expanded(
                      child: AppTextField(
                        label: 'Opening Stock',
                        controller: _stockController,
                        keyboardType: TextInputType.number,
                      ),
                    ),
                  if (!_isEdit) const SizedBox(width: 12),
                  Expanded(
                    child: AppTextField(
                      label: 'Low Stock Alert',
                      controller: _lowStockController,
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              suppliersAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (_, __) => const SizedBox.shrink(),
                data: (suppliers) => DropdownButtonFormField<int>(
                  value: _selectedSupplierId,
                  decoration: const InputDecoration(
                    labelText: 'Supplier (optional)',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('None')),
                    ...suppliers.map(
                      (s) =>
                          DropdownMenuItem(value: s.id, child: Text(s.name)),
                    ),
                  ],
                  onChanged: (v) => setState(() => _selectedSupplierId = v),
                ),
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
}

class _ImagePicker extends StatelessWidget {
  const _ImagePicker({
    required this.imageFile,
    required this.existingUrl,
    required this.loading,
    required this.onTap,
    required this.onRemove,
  });

  final File? imageFile;
  final String? existingUrl;
  final bool loading;
  final VoidCallback onTap;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final hasImage = imageFile != null || existingUrl != null;
    return Center(
      child: Stack(
        alignment: Alignment.topRight,
        children: [
          GestureDetector(
            onTap: loading ? null : onTap,
            child: Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: loading
                  ? const Center(child: CircularProgressIndicator())
                  : hasImage
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: imageFile != null
                              ? Image.file(imageFile!, fit: BoxFit.cover)
                              : Image.network(existingUrl!, fit: BoxFit.cover),
                        )
                      : const Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.add_photo_alternate_outlined,
                                size: 32, color: Colors.grey),
                            SizedBox(height: 4),
                            Text('Add Image',
                                style:
                                    TextStyle(fontSize: 11, color: Colors.grey)),
                          ],
                        ),
            ),
          ),
          if (hasImage)
            GestureDetector(
              onTap: onRemove,
              child: Container(
                decoration: const BoxDecoration(
                  color: Colors.red,
                  shape: BoxShape.circle,
                ),
                padding: const EdgeInsets.all(2),
                child: const Icon(Icons.close, size: 14, color: Colors.white),
              ),
            ),
        ],
      ),
    );
  }
}
