import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/tax_rate_model.dart';
import '../../core/providers/tax_rate_provider.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/shimmer_list.dart';

class TaxRatesScreen extends ConsumerWidget {
  const TaxRatesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final taxRatesAsync = ref.watch(taxRateProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tax Rates'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showForm(context, ref, null),
          ),
        ],
      ),
      body: taxRatesAsync.when(
        loading: () => const ShimmerList(),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(e.toString()),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.read(taxRateProvider.notifier).refresh(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (rates) => rates.isEmpty
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.percent, size: 48, color: Colors.grey),
                    const SizedBox(height: 12),
                    const Text('No tax rates yet',
                        style: TextStyle(color: Colors.grey)),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => _showForm(context, ref, null),
                      icon: const Icon(Icons.add),
                      label: const Text('Add Tax Rate'),
                    ),
                  ],
                ),
              )
            : RefreshIndicator(
                onRefresh: () => ref.read(taxRateProvider.notifier).refresh(),
                child: ListView.separated(
                  itemCount: rates.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, i) {
                    final t = rates[i];
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Colors.blue.shade50,
                        child: Text(
                          '${t.rate.toInt()}%',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.blue.shade700,
                          ),
                        ),
                      ),
                      title: Text(t.name,
                          style:
                              const TextStyle(fontWeight: FontWeight.w500)),
                      subtitle: Text(t.type),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (!t.isActive)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade200,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Text('Inactive',
                                  style: TextStyle(
                                      fontSize: 11, color: Colors.grey)),
                            ),
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 20),
                            onPressed: () => _showForm(context, ref, t),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline,
                                size: 20, color: Colors.red),
                            onPressed: () => _confirmDelete(context, ref, t),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
      ),
    );
  }

  void _showForm(BuildContext context, WidgetRef ref, TaxRateModel? existing) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => _TaxRateForm(existing: existing, ref: ref),
    );
  }

  void _confirmDelete(
      BuildContext context, WidgetRef ref, TaxRateModel rate) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Tax Rate'),
        content: Text('Delete "${rate.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ref.read(taxRateProvider.notifier).delete(rate.id);
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                        content: Text(e.toString()),
                        backgroundColor: Colors.red),
                  );
                }
              }
            },
            child:
                const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}

class _TaxRateForm extends StatefulWidget {
  const _TaxRateForm({required this.existing, required this.ref});

  final TaxRateModel? existing;
  final WidgetRef ref;

  @override
  State<_TaxRateForm> createState() => _TaxRateFormState();
}

class _TaxRateFormState extends State<_TaxRateForm> {
  final _nameCtrl = TextEditingController();
  final _rateCtrl = TextEditingController();
  String _type = 'GST';
  bool _isActive = true;
  bool _loading = false;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    if (_isEdit) {
      _nameCtrl.text = widget.existing!.name;
      _rateCtrl.text = widget.existing!.rate.toString();
      _type = widget.existing!.type;
      _isActive = widget.existing!.isActive;
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _rateCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _nameCtrl.text.trim();
    final rate = double.tryParse(_rateCtrl.text);
    if (name.isEmpty || rate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all fields')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      final data = {
        'name': name,
        'rate': rate,
        'type': _type,
        'is_active': _isActive,
      };
      if (_isEdit) {
        await widget.ref
            .read(taxRateProvider.notifier)
            .edit(widget.existing!.id, data);
      } else {
        await widget.ref.read(taxRateProvider.notifier).create(data);
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
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _isEdit ? 'Edit Tax Rate' : 'Add Tax Rate',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _nameCtrl,
            decoration: const InputDecoration(
              labelText: 'Name (e.g. GST 18%)',
              border: OutlineInputBorder(),
              isDense: true,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _rateCtrl,
            keyboardType:
                const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'Rate (%)',
              border: OutlineInputBorder(),
              isDense: true,
            ),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _type,
            decoration: const InputDecoration(
              labelText: 'Type',
              border: OutlineInputBorder(),
              isDense: true,
            ),
            items: const [
              DropdownMenuItem(value: 'GST', child: Text('GST')),
              DropdownMenuItem(value: 'IGST', child: Text('IGST')),
              DropdownMenuItem(value: 'VAT', child: Text('VAT')),
              DropdownMenuItem(value: 'Other', child: Text('Other')),
            ],
            onChanged: (v) => setState(() => _type = v ?? 'GST'),
          ),
          const SizedBox(height: 8),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Active'),
            value: _isActive,
            onChanged: (v) => setState(() => _isActive = v),
            dense: true,
          ),
          const SizedBox(height: 16),
          AppButton(
            label: _isEdit ? 'Update' : 'Add Tax Rate',
            onPressed: _submit,
            loading: _loading,
          ),
        ],
      ),
    );
  }
}
