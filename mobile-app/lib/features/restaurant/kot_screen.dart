import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/models/kot_model.dart';
import '../../core/providers/kot_provider.dart';
import '../../core/widgets/empty_state.dart';
import '../../core/widgets/shimmer_list.dart';

class KotScreen extends ConsumerStatefulWidget {
  const KotScreen({super.key, this.tableId, this.tableNumber});

  final int? tableId;
  final String? tableNumber;

  @override
  ConsumerState<KotScreen> createState() => _KotScreenState();
}

class _KotScreenState extends ConsumerState<KotScreen> {
  String? _statusFilter;

  static const _statuses = [
    (null, 'All'),
    ('pending', 'Pending'),
    ('in_progress', 'In Progress'),
    ('completed', 'Completed'),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(kotProvider.notifier).setTableFilter(widget.tableId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final kotsAsync = ref.watch(kotProvider);
    final title = widget.tableNumber != null
        ? 'Table ${widget.tableNumber} — KOTs'
        : 'Kitchen Orders';

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(kotProvider.notifier).refresh(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add),
        label: const Text('New KOT'),
        onPressed: () => _showNewKotDialog(context),
      ),
      body: Column(
        children: [
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              children: _statuses.map((s) {
                final selected = _statusFilter == s.$1;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(s.$2),
                    selected: selected,
                    onSelected: (_) {
                      setState(() => _statusFilter = s.$1);
                      ref.read(kotProvider.notifier).setStatusFilter(s.$1);
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(
            child: kotsAsync.when(
              loading: () => const ShimmerList(),
              error: (e, _) => ErrorRetry(
                error: e,
                onRetry: () => ref.read(kotProvider.notifier).refresh(),
              ),
              data: (kots) => kots.isEmpty
                  ? const EmptyState(
                      icon: Icons.receipt_long_outlined,
                      message: 'No kitchen orders found',
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 80),
                      itemCount: kots.length,
                      itemBuilder: (_, i) => _KotCard(kot: kots[i]),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  void _showNewKotDialog(BuildContext context) {
    final items = <Map<String, dynamic>>[
      {'name': TextEditingController(), 'qty': TextEditingController(text: '1')}
    ];
    final notesCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 16,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
          ),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('New KOT',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold)),
                    TextButton.icon(
                      icon: const Icon(Icons.add),
                      label: const Text('Add Item'),
                      onPressed: () => setS(() => items.add({
                            'name': TextEditingController(),
                            'qty': TextEditingController(text: '1'),
                          })),
                    ),
                  ],
                ),
                ...items.asMap().entries.map((e) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Expanded(
                            flex: 3,
                            child: TextFormField(
                              controller: e.value['name'],
                              decoration: InputDecoration(
                                labelText: 'Item ${e.key + 1}',
                                isDense: true,
                              ),
                              validator: (v) =>
                                  v == null || v.isEmpty ? 'Required' : null,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextFormField(
                              controller: e.value['qty'],
                              decoration: const InputDecoration(
                                  labelText: 'Qty', isDense: true),
                              keyboardType: TextInputType.number,
                              validator: (v) {
                                final n = double.tryParse(v ?? '');
                                if (n == null || n <= 0) return '!';
                                return null;
                              },
                            ),
                          ),
                          if (items.length > 1)
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline,
                                  color: Colors.red, size: 20),
                              onPressed: () => setS(() => items.removeAt(e.key)),
                            ),
                        ],
                      ),
                    )),
                TextFormField(
                  controller: notesCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Notes (optional)', isDense: true),
                  maxLines: 2,
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () async {
                      if (!formKey.currentState!.validate()) return;
                      Navigator.pop(ctx);
                      try {
                        await ref.read(kotProvider.notifier).create({
                          'table_id': widget.tableId,
                          'items': items
                              .map((i) => {
                                    'name': (i['name'] as TextEditingController)
                                        .text
                                        .trim(),
                                    'qty': double.parse(
                                        (i['qty'] as TextEditingController)
                                            .text),
                                  })
                              .toList(),
                          'notes': notesCtrl.text.trim().isEmpty
                              ? null
                              : notesCtrl.text.trim(),
                        });
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(e.toString())),
                          );
                        }
                      }
                    },
                    child: const Text('Send to Kitchen'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _KotCard extends ConsumerWidget {
  const _KotCard({required this.kot});

  final KotModel kot;

  Color get _statusColor => switch (kot.status) {
        'pending' => Colors.orange,
        'in_progress' => Colors.blue,
        'completed' => Colors.green,
        _ => Colors.grey,
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(kot.kotNumber,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 15)),
                    if (kot.tableNumber.isNotEmpty)
                      Text('Table: ${kot.tableNumber}',
                          style: TextStyle(
                              color: Colors.grey.shade600, fontSize: 12)),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: _statusColor.withAlpha(30),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: _statusColor),
                      ),
                      child: Text(
                        kot.status.replaceAll('_', ' ').toUpperCase(),
                        style: TextStyle(
                            color: _statusColor,
                            fontSize: 11,
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                    Text(
                      DateFormat('hh:mm a').format(kot.kotTime),
                      style: TextStyle(
                          color: Colors.grey.shade500, fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),
            const Divider(height: 16),
            ...kot.items.map((item) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      Text('${item.qty}x ',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.deepOrange)),
                      Expanded(child: Text(item.name)),
                      if (item.notes != null)
                        Text(item.notes!,
                            style: TextStyle(
                                color: Colors.grey.shade500,
                                fontSize: 11,
                                fontStyle: FontStyle.italic)),
                    ],
                  ),
                )),
            if (kot.notes != null && kot.notes!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text('Note: ${kot.notes}',
                  style: TextStyle(
                      color: Colors.grey.shade600,
                      fontSize: 12,
                      fontStyle: FontStyle.italic)),
            ],
            if (kot.isActive) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  if (kot.isPending)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () =>
                            ref.read(kotProvider.notifier).markInProgress(kot.id),
                        child: const Text('Start'),
                      ),
                    ),
                  if (kot.isPending) const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton(
                      onPressed: () =>
                          ref.read(kotProvider.notifier).complete(kot.id),
                      child: const Text('Complete'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.cancel_outlined, color: Colors.red),
                    onPressed: () async {
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (c) => AlertDialog(
                          title: const Text('Cancel KOT'),
                          content: Text('Cancel ${kot.kotNumber}?'),
                          actions: [
                            TextButton(
                                onPressed: () => Navigator.pop(c, false),
                                child: const Text('No')),
                            TextButton(
                                onPressed: () => Navigator.pop(c, true),
                                child: const Text('Yes',
                                    style: TextStyle(color: Colors.red))),
                          ],
                        ),
                      );
                      if (confirm == true) {
                        await ref.read(kotProvider.notifier).cancel(kot.id);
                      }
                    },
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
