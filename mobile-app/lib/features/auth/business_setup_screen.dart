import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/business_provider.dart';
import '../../core/services/api_service.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/app_text_field.dart';

class BusinessSetupScreen extends ConsumerStatefulWidget {
  const BusinessSetupScreen({super.key});

  @override
  ConsumerState<BusinessSetupScreen> createState() =>
      _BusinessSetupScreenState();
}

class _BusinessSetupScreenState extends ConsumerState<BusinessSetupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _gstController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();

  String _businessType = 'retail';
  bool _loading = false;

  static const _types = [
    ('retail', 'Retail Shop', Icons.store),
    ('restaurant', 'Restaurant', Icons.restaurant),
    ('wholesale', 'Wholesale', Icons.warehouse),
    ('service', 'Service', Icons.build),
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _gstController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await ApiService.post('/business/setup', data: {
        'name': _nameController.text.trim(),
        'business_type': _businessType,
        'gst_number': _gstController.text.trim(),
        'mobile_number': _phoneController.text.trim(),
        'address': _addressController.text.trim(),
      });
      await ref.read(businessProvider.notifier).loadBusiness();
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
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Set Up Your Business')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Business Type',
                  style: theme.textTheme.titleSmall
                      ?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                childAspectRatio: 2.5,
                children: _types.map((t) {
                  final selected = _businessType == t.$1;
                  return GestureDetector(
                    onTap: () => setState(() => _businessType = t.$1),
                    child: Container(
                      decoration: BoxDecoration(
                        color: selected
                            ? theme.colorScheme.primary
                            : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: selected
                              ? theme.colorScheme.primary
                              : Colors.grey.shade300,
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(t.$3,
                              size: 20,
                              color: selected ? Colors.white : Colors.grey),
                          const SizedBox(width: 8),
                          Text(t.$2,
                              style: TextStyle(
                                  color: selected ? Colors.white : Colors.black,
                                  fontWeight: FontWeight.w500)),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),
              AppTextField(
                label: 'Business Name *',
                controller: _nameController,
                validator: (v) =>
                    v == null || v.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              AppTextField(
                label: 'Mobile Number *',
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                validator: (v) =>
                    v == null || v.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              AppTextField(
                label: 'GST Number (optional)',
                controller: _gstController,
              ),
              const SizedBox(height: 16),
              AppTextField(
                label: 'Address',
                controller: _addressController,
                maxLines: 2,
              ),
              const SizedBox(height: 24),
              AppButton(
                label: 'Create Business',
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
