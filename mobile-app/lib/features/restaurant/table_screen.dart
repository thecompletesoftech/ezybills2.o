import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/restaurant_table_model.dart';
import '../../core/providers/table_provider.dart';
import '../../core/widgets/empty_state.dart';
import '../../core/widgets/shimmer_list.dart';
import 'kot_screen.dart';

class TableScreen extends ConsumerWidget {
  const TableScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tablesAsync = ref.watch(tableProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Table Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(tableProvider.notifier).refresh(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add),
        label: const Text('Add Table'),
        onPressed: () => _showAddTableDialog(context, ref),
      ),
      body: tablesAsync.when(
        loading: () => const ShimmerList(),
        error: (e, _) => ErrorRetry(
          error: e,
          onRetry: () => ref.read(tableProvider.notifier).refresh(),
        ),
        data: (tables) {
          if (tables.isEmpty) {
            return const EmptyState(
              icon: Icons.table_bar_outlined,
              message: 'No tables added yet',
            );
          }
          return GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              childAspectRatio: 0.9,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: tables.length,
            itemBuilder: (_, i) => _TableCard(table: tables[i]),
          );
        },
      ),
    );
  }

  void _showAddTableDialog(BuildContext context, WidgetRef ref) {
    final numberCtrl = TextEditingController();
    final seatsCtrl = TextEditingController(text: '4');
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Table'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: numberCtrl,
                decoration: const InputDecoration(labelText: 'Table Number/Name'),
                validator: (v) =>
                    v == null || v.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: seatsCtrl,
                decoration: const InputDecoration(labelText: 'Seats'),
                keyboardType: TextInputType.number,
                validator: (v) {
                  final n = int.tryParse(v ?? '');
                  if (n == null || n < 1) return 'Enter valid seat count';
                  return null;
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              Navigator.pop(ctx);
              try {
                await ref.read(tableProvider.notifier).create({
                  'table_number': numberCtrl.text.trim(),
                  'seats': int.parse(seatsCtrl.text.trim()),
                });
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(e.toString())),
                  );
                }
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }
}

class _TableCard extends ConsumerWidget {
  const _TableCard({required this.table});

  final RestaurantTableModel table;

  Color get _statusColor => switch (table.status) {
        'occupied' => Colors.red.shade400,
        'reserved' => Colors.orange.shade400,
        'dirty' => Colors.purple.shade300,
        _ => Colors.green.shade400,
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => KotScreen(tableId: table.id, tableNumber: table.tableNumber),
        ),
      ),
      onLongPress: () => _showTableOptions(context, ref),
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _statusColor, width: 2),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.table_restaurant, size: 32, color: _statusColor),
              const SizedBox(height: 6),
              Text(
                table.tableNumber,
                style: const TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 16),
              ),
              Text(
                '${table.seats} seats',
                style:
                    TextStyle(fontSize: 11, color: Colors.grey.shade600),
              ),
              if ((table.pendingKotsCount ?? 0) > 0)
                Container(
                  margin: const EdgeInsets.only(top: 4),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${table.pendingKotsCount} KOT',
                    style: const TextStyle(
                        color: Colors.white, fontSize: 10),
                  ),
                ),
              const SizedBox(height: 4),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: _statusColor.withAlpha(30),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  table.status.toUpperCase(),
                  style: TextStyle(
                      color: _statusColor,
                      fontSize: 10,
                      fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showTableOptions(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.check_circle_outline),
              title: const Text('Mark Empty'),
              onTap: () {
                Navigator.pop(ctx);
                ref.read(tableProvider.notifier).updateStatus(table.id, 'empty');
              },
            ),
            ListTile(
              leading: const Icon(Icons.cleaning_services_outlined),
              title: const Text('Mark Dirty'),
              onTap: () {
                Navigator.pop(ctx);
                ref
                    .read(tableProvider.notifier)
                    .updateStatus(table.id, 'dirty');
              },
            ),
            ListTile(
              leading:
                  const Icon(Icons.delete_outline, color: Colors.red),
              title: const Text('Delete Table',
                  style: TextStyle(color: Colors.red)),
              onTap: () async {
                Navigator.pop(ctx);
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (c) => AlertDialog(
                    title: const Text('Delete Table'),
                    content: Text(
                        'Delete table ${table.tableNumber}?'),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(c, false),
                          child: const Text('Cancel')),
                      TextButton(
                          onPressed: () => Navigator.pop(c, true),
                          child: const Text('Delete',
                              style: TextStyle(color: Colors.red))),
                    ],
                  ),
                );
                if (confirm == true) {
                  await ref.read(tableProvider.notifier).delete(table.id);
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
