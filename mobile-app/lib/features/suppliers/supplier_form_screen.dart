import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/supplier_model.dart';
import '../../core/providers/supplier_provider.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/app_text_field.dart';

class SupplierFormScreen extends ConsumerStatefulWidget {
  const SupplierFormScreen({super.key, this.supplier});

  final SupplierModel? supplier;

  @override
  ConsumerState<SupplierFormScreen> createState() => _SupplierFormScreenState();
}

class _SupplierFormScreenState extends ConsumerState<SupplierFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _gstController = TextEditingController();
  final _openingBalanceController = TextEditingController();
  bool _loading = false;

  bool get _isEditing => widget.supplier != null;

  @override
  void initState() {
    super.initState();
    final s = widget.supplier;
    if (s != null) {
      _nameController.text = s.name;
      _phoneController.text = s.phone ?? '';
      _emailController.text = s.email ?? '';
      _addressController.text = s.address ?? '';
      _gstController.text = s.gstNumber ?? '';
      _openingBalanceController.text = s.dueAmount.toString();
    } else {
      _openingBalanceController.text = '0';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _gstController.dispose();
    _openingBalanceController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    final data = {
      'name': _nameController.text.trim(),
      'phone': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
      'email': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
      'address': _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
      'gst_number': _gstController.text.trim().isEmpty ? null : _gstController.text.trim(),
      'opening_balance': double.tryParse(_openingBalanceController.text) ?? 0,
    };
    try {
      if (_isEditing) {
        await ref.read(supplierProvider.notifier).edit(widget.supplier!.id, data);
      } else {
        await ref.read(supplierProvider.notifier).create(data);
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
        appBar: AppBar(title: Text(_isEditing ? 'Edit Supplier' : 'Add Supplier')),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                AppTextField(
                  label: 'Supplier Name *',
                  controller: _nameController,
                  validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                AppTextField(
                  label: 'Mobile',
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 12),
                AppTextField(
                  label: 'Email',
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 12),
                AppTextField(
                  label: 'Address',
                  controller: _addressController,
                  maxLines: 2,
                ),
                const SizedBox(height: 12),
                AppTextField(
                  label: 'GST Number',
                  controller: _gstController,
                ),
                const SizedBox(height: 12),
                AppTextField(
                  label: 'Opening Balance (₹)',
                  controller: _openingBalanceController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                ),
                const SizedBox(height: 24),
                AppButton(
                  label: _isEditing ? 'Update Supplier' : 'Add Supplier',
                  onPressed: _submit,
                  loading: _loading,
                ),
              ],
            ),
          ),
        ),
      );
}
