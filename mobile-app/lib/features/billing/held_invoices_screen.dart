import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/invoice_model.dart';
import '../../core/providers/invoice_provider.dart';
import '../../core/widgets/currency_text.dart';
import '../../core/widgets/empty_state.dart';

class HeldInvoicesScreen extends ConsumerWidget {
  const HeldInvoicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Held Bills')),
      body: FutureBuilder<List<InvoiceModel>>(
        future: ref.read(invoiceProvider.notifier).getHeld(),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final items = snap.data ?? [];
          if (items.isEmpty) {
            return const EmptyState(
              message: 'No held bills',
              icon: Icons.pause_circle_outline,
            );
          }
          return ListView.separated(
            itemCount: items.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, i) {
              final inv = items[i];
              return ListTile(
                title: Text(inv.invoiceNumber),
                subtitle: Text(inv.customerName ?? 'Walk-in customer'),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    CurrencyText(inv.totalAmount, bold: true),
                    Text('${inv.items.length} items',
                        style: const TextStyle(
                            fontSize: 11, color: Colors.grey)),
                  ],
                ),
                onTap: () async {
                  await ref
                      .read(invoiceProvider.notifier)
                      .resumeInvoice(inv.id);
                  if (context.mounted) Navigator.pop(context);
                },
              );
            },
          );
        },
      ),
    );
  }
}
