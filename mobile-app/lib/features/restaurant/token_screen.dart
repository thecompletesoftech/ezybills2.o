import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/models/token_model.dart';
import '../../core/providers/token_provider.dart';
import '../../core/widgets/empty_state.dart';
import '../../core/widgets/shimmer_list.dart';

class TokenScreen extends ConsumerStatefulWidget {
  const TokenScreen({super.key});

  @override
  ConsumerState<TokenScreen> createState() => _TokenScreenState();
}

class _TokenScreenState extends ConsumerState<TokenScreen> {
  String? _statusFilter;

  static const _statuses = [
    (null, 'All'),
    ('pending', 'Pending'),
    ('ready', 'Ready'),
    ('served', 'Served'),
  ];

  @override
  Widget build(BuildContext context) {
    final tokensAsync = ref.watch(tokenProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Token Queue'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(tokenProvider.notifier).refresh(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add),
        label: const Text('New Token'),
        onPressed: () => _showNewTokenDialog(context),
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
                      ref.read(tokenProvider.notifier).setStatusFilter(s.$1);
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(
            child: tokensAsync.when(
              loading: () => const ShimmerList(),
              error: (e, _) => ErrorRetry(
                error: e,
                onRetry: () => ref.read(tokenProvider.notifier).refresh(),
              ),
              data: (tokens) => tokens.isEmpty
                  ? const EmptyState(
                      icon: Icons.confirmation_number_outlined,
                      message: 'No tokens for today',
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 80),
                      itemCount: tokens.length,
                      itemBuilder: (_, i) => _TokenCard(token: tokens[i]),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  void _showNewTokenDialog(BuildContext context) {
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
                    const Text('New Token',
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
                                  isDense: true),
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
                              onPressed: () =>
                                  setS(() => items.removeAt(e.key)),
                            ),
                        ],
                      ),
                    )),
                TextFormField(
                  controller: notesCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Notes (optional)', isDense: true),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () async {
                      if (!formKey.currentState!.validate()) return;
                      Navigator.pop(ctx);
                      try {
                        await ref.read(tokenProvider.notifier).create({
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
                    child: const Text('Issue Token'),
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

class _TokenCard extends ConsumerWidget {
  const _TokenCard({required this.token});

  final TokenModel token;

  Color get _statusColor => switch (token.status) {
        'pending' => Colors.orange,
        'ready' => Colors.green,
        'served' => Colors.grey,
        _ => Colors.red,
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
                Text(token.tokenNumber,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 18)),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _statusColor.withAlpha(30),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: _statusColor),
                  ),
                  child: Text(
                    token.status.toUpperCase(),
                    style: TextStyle(
                        color: _statusColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            Text(
              DateFormat('hh:mm a').format(token.tokenTime),
              style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
            ),
            const Divider(height: 16),
            ...token.items.map((item) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      Text('${item.qty}x ',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.deepOrange)),
                      Expanded(child: Text(item.name)),
                    ],
                  ),
                )),
            if (token.tokenAmount != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  '₹${token.tokenAmount!.toStringAsFixed(2)}',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            if (!token.isServed && !token.isCancelled) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  if (token.isPending)
                    Expanded(
                      child: FilledButton.icon(
                        icon: const Icon(Icons.notifications_active, size: 16),
                        label: const Text('Mark Ready'),
                        onPressed: () =>
                            ref.read(tokenProvider.notifier).markReady(token.id),
                      ),
                    ),
                  if (token.isReady) ...[
                    Expanded(
                      child: FilledButton.icon(
                        icon: const Icon(Icons.check_circle, size: 16),
                        label: const Text('Mark Served'),
                        onPressed: () =>
                            ref.read(tokenProvider.notifier).markServed(token.id),
                        style: FilledButton.styleFrom(
                            backgroundColor: Colors.green),
                      ),
                    ),
                  ],
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: () =>
                        ref.read(tokenProvider.notifier).cancel(token.id),
                    child: const Text('Cancel',
                        style: TextStyle(color: Colors.red)),
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
