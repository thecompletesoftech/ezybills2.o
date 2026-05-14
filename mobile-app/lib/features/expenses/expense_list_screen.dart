import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/models/expense_model.dart';
import '../../core/services/api_service.dart';
import '../../core/widgets/currency_text.dart';
import '../../core/widgets/empty_state.dart';
import '../../core/widgets/shimmer_list.dart';

class ExpenseListScreen extends ConsumerStatefulWidget {
  const ExpenseListScreen({super.key});

  @override
  ConsumerState<ExpenseListScreen> createState() => _ExpenseListScreenState();
}

class _ExpenseListScreenState extends ConsumerState<ExpenseListScreen> {
  List<ExpenseModel>? _expenses;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final list = await ApiService.getList('/expenses');
      setState(() {
        _expenses = list
            .map((e) => ExpenseModel.fromJson(e as Map<String, dynamic>))
            .toList();
      });
    } catch (_) {
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Expenses')),
        floatingActionButton: FloatingActionButton(
          onPressed: () async {
            await _showAddExpenseSheet(context);
            await _load();
          },
          child: const Icon(Icons.add),
        ),
        body: _loading
            ? const ShimmerList()
            : _expenses == null || _expenses!.isEmpty
                ? const EmptyState(
                    message: 'No expenses recorded',
                    icon: Icons.receipt_long_outlined)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView.separated(
                      itemCount: _expenses!.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (_, i) {
                        final e = _expenses![i];
                        return ListTile(
                          leading: const CircleAvatar(
                            child: Icon(Icons.money_off, size: 20),
                          ),
                          title: Text(e.title),
                          subtitle: Text(
                              '${e.categoryName ?? 'General'} · ${DateFormat('dd MMM').format(e.expenseDate)}'),
                          trailing: CurrencyText(e.amount,
                              bold: true, color: Colors.red),
                        );
                      },
                    ),
                  ),
      );

  Future<void> _showAddExpenseSheet(BuildContext context) async {
    final titleCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Add Expense',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 16),
            TextField(
              controller: titleCtrl,
              decoration: const InputDecoration(
                  labelText: 'Title', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: amountCtrl,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))
              ],
              decoration: const InputDecoration(
                  labelText: 'Amount (₹)',
                  border: OutlineInputBorder(),
                  prefixText: '₹ '),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  final amount = double.tryParse(amountCtrl.text);
                  if (titleCtrl.text.isEmpty || amount == null) return;
                  await ApiService.post('/expenses', data: {
                    'title': titleCtrl.text.trim(),
                    'amount': amount,
                    'expense_date': DateTime.now()
                        .toIso8601String()
                        .split('T')
                        .first,
                  });
                  if (ctx.mounted) Navigator.pop(ctx);
                },
                child: const Text('Save Expense'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
