import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/business_provider.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/app_text_field.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _gstController = TextEditingController();
  final _upiController = TextEditingController();
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    final business = ref.read(businessProvider).valueOrNull;
    if (business != null) {
      _nameController.text = business.name;
      _phoneController.text = business.mobileNumber ?? '';
      _gstController.text = business.gstNumber ?? '';
      _upiController.text = business.upiId ?? '';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _gstController.dispose();
    _upiController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _loading = true);
    try {
      await ref.read(businessProvider.notifier).updateBusiness({
        'name': _nameController.text.trim(),
        'mobile_number': _phoneController.text.trim(),
        'gst_number': _gstController.text.trim(),
        'upi_id': _upiController.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Settings saved')),
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
    final user = ref.watch(authProvider).valueOrNull;

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (user != null) ...[
            const Text('Account',
                style:
                    TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.person),
                    title: Text(user.name),
                    subtitle: Text(user.email ?? user.phone ?? ''),
                  ),
                  ListTile(
                    leading: const Icon(Icons.badge),
                    title: Text(user.role.toUpperCase()),
                    subtitle: const Text('Role'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],
          const Text('Business Information',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          AppTextField(
              label: 'Business Name', controller: _nameController),
          const SizedBox(height: 12),
          AppTextField(
              label: 'Mobile Number',
              controller: _phoneController,
              keyboardType: TextInputType.phone),
          const SizedBox(height: 12),
          AppTextField(label: 'GST Number', controller: _gstController),
          const SizedBox(height: 12),
          AppTextField(label: 'UPI ID', controller: _upiController),
          const SizedBox(height: 24),
          AppButton(label: 'Save Changes', onPressed: _save, loading: _loading),
        ],
      ),
    );
  }
}
