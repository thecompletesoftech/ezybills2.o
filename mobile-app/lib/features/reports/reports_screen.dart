import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/services/api_service.dart';
import '../../core/widgets/currency_text.dart';
import '../../core/widgets/shimmer_list.dart';

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Reports'),
          bottom: const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Sales'),
              Tab(text: 'P & L'),
              Tab(text: 'Inventory'),
              Tab(text: 'GST'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _SalesReport(),
            _ProfitLossReport(),
            _InventoryReport(),
            _GstReport(),
          ],
        ),
      ),
    );
  }
}

class _DateRangeBar extends StatelessWidget {
  const _DateRangeBar({
    required this.from,
    required this.to,
    required this.onChanged,
  });

  final DateTime from;
  final DateTime to;
  final void Function(DateTime from, DateTime to) onChanged;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              icon: const Icon(Icons.calendar_today, size: 16),
              label: Text(DateFormat('dd MMM').format(from)),
              onPressed: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: from,
                  firstDate: DateTime(2020),
                  lastDate: to,
                );
                if (picked != null) onChanged(picked, to);
              },
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 8),
            child: Text('to'),
          ),
          Expanded(
            child: OutlinedButton.icon(
              icon: const Icon(Icons.calendar_today, size: 16),
              label: Text(DateFormat('dd MMM').format(to)),
              onPressed: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: to,
                  firstDate: from,
                  lastDate: DateTime.now(),
                );
                if (picked != null) onChanged(from, picked);
              },
            ),
          ),
        ],
      );
}

class _SalesReport extends StatefulWidget {
  const _SalesReport();

  @override
  State<_SalesReport> createState() => _SalesReportState();
}

class _SalesReportState extends State<_SalesReport> {
  DateTime _from = DateTime.now().subtract(const Duration(days: 29));
  DateTime _to = DateTime.now();
  Map<String, dynamic>? _data;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final fmt = DateFormat('yyyy-MM-dd');
      final response = await ApiService.get('/reports/sales', queryParameters: {
        'from': fmt.format(_from),
        'to': fmt.format(_to),
      });
      setState(() => _data = response['data'] as Map<String, dynamic>? ?? response);
    } catch (_) {
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const ShimmerList(itemCount: 4);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _DateRangeBar(
          from: _from,
          to: _to,
          onChanged: (f, t) {
            setState(() {
              _from = f;
              _to = t;
            });
            _load();
          },
        ),
        const SizedBox(height: 16),
        if (_data != null) ...[
          Row(
            children: [
              Expanded(
                child: _ReportCard(
                  'Total Sales',
                  _toDouble(_data!['total_sales']),
                  icon: Icons.trending_up,
                  color: Colors.green,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _ReportCard(
                  'Invoices',
                  (_data!['invoice_count'] as int? ?? 0).toDouble(),
                  icon: Icons.receipt,
                  color: Colors.blue,
                  isCurrency: false,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _ReportCard(
                  'Collections',
                  _toDouble(_data!['total_collected']),
                  icon: Icons.payments,
                  color: Colors.teal,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _ReportCard(
                  'Pending Dues',
                  _toDouble(_data!['total_due']),
                  icon: Icons.hourglass_empty,
                  color: Colors.orange,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  static double _toDouble(dynamic v) {
    if (v == null) return 0;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    return double.tryParse(v.toString()) ?? 0;
  }
}

class _ProfitLossReport extends StatelessWidget {
  const _ProfitLossReport();

  @override
  Widget build(BuildContext context) => const Center(
        child: Text('P&L report coming soon'),
      );
}

class _InventoryReport extends StatelessWidget {
  const _InventoryReport();

  @override
  Widget build(BuildContext context) => const Center(
        child: Text('Inventory report coming soon'),
      );
}

class _GstReport extends StatelessWidget {
  const _GstReport();

  @override
  Widget build(BuildContext context) => const Center(
        child: Text('GST report coming soon'),
      );
}

class _ReportCard extends StatelessWidget {
  const _ReportCard(
    this.label,
    this.value, {
    required this.icon,
    required this.color,
    this.isCurrency = true,
  });

  final String label;
  final double value;
  final IconData icon;
  final Color color;
  final bool isCurrency;

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color),
              const SizedBox(height: 8),
              isCurrency
                  ? CurrencyText(value,
                      bold: true, style: const TextStyle(fontSize: 18))
                  : Text(value.toInt().toString(),
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold)),
              Text(label,
                  style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        ),
      );
}
