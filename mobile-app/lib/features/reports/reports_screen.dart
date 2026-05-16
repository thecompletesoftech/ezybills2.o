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

class _ProfitLossReport extends StatefulWidget {
  const _ProfitLossReport();

  @override
  State<_ProfitLossReport> createState() => _ProfitLossReportState();
}

class _ProfitLossReportState extends State<_ProfitLossReport> {
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
      final response = await ApiService.get('/reports/profit-loss',
          queryParameters: {'from': fmt.format(_from), 'to': fmt.format(_to)});
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
        _DateRangeBar(from: _from, to: _to, onChanged: (f, t) {
          setState(() { _from = f; _to = t; });
          _load();
        }),
        const SizedBox(height: 16),
        if (_data != null) ...[
          Row(children: [
            Expanded(child: _ReportCard('Revenue', _toDouble(_data!['total_revenue']), icon: Icons.trending_up, color: Colors.green)),
            const SizedBox(width: 12),
            Expanded(child: _ReportCard('Cost', _toDouble(_data!['total_cost']), icon: Icons.shopping_cart_outlined, color: Colors.orange)),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _ReportCard('Gross Profit', _toDouble(_data!['gross_profit']), icon: Icons.account_balance_wallet_outlined, color: Colors.teal)),
            const SizedBox(width: 12),
            Expanded(child: _ReportCard('Expenses', _toDouble(_data!['total_expenses']), icon: Icons.receipt_long_outlined, color: Colors.red)),
          ]),
          const SizedBox(height: 12),
          _ReportCard('Net Profit', _toDouble(_data!['net_profit']), icon: Icons.bar_chart, color: _toDouble(_data!['net_profit']) >= 0 ? Colors.green : Colors.red),
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

class _InventoryReport extends StatefulWidget {
  const _InventoryReport();

  @override
  State<_InventoryReport> createState() => _InventoryReportState();
}

class _InventoryReportState extends State<_InventoryReport> {
  Map<String, dynamic>? _data;
  List<dynamic> _lowStock = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final response = await ApiService.get('/reports/inventory');
      final body = response['data'] as Map<String, dynamic>? ?? response;
      setState(() {
        _data = body;
        _lowStock = body['low_stock_products'] as List<dynamic>? ?? [];
      });
    } catch (_) {
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const ShimmerList(itemCount: 4);
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_data != null) ...[
            Row(children: [
              Expanded(child: _ReportCard('Total Products', _toDouble(_data!['total_products']), icon: Icons.inventory_2_outlined, color: Colors.blue, isCurrency: false)),
              const SizedBox(width: 12),
              Expanded(child: _ReportCard('Stock Value', _toDouble(_data!['total_stock_value']), icon: Icons.attach_money, color: Colors.green)),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: _ReportCard('Low Stock', _toDouble(_data!['low_stock_count']), icon: Icons.warning_amber_outlined, color: Colors.orange, isCurrency: false)),
              const SizedBox(width: 12),
              Expanded(child: _ReportCard('Out of Stock', _toDouble(_data!['out_of_stock_count']), icon: Icons.remove_shopping_cart_outlined, color: Colors.red, isCurrency: false)),
            ]),
            if (_lowStock.isNotEmpty) ...[
              const SizedBox(height: 20),
              const Text('Low Stock Items', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              const SizedBox(height: 8),
              ..._lowStock.map((item) {
                final m = item as Map<String, dynamic>;
                return Card(
                  child: ListTile(
                    leading: const Icon(Icons.warning_amber, color: Colors.orange),
                    title: Text(m['name'] as String? ?? ''),
                    subtitle: Text('Stock: ${m['current_stock'] ?? 0}  ·  Min: ${m['low_stock_threshold'] ?? 0}'),
                    dense: true,
                  ),
                );
              }),
            ],
          ],
        ],
      ),
    );
  }

  static double _toDouble(dynamic v) {
    if (v == null) return 0;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    return double.tryParse(v.toString()) ?? 0;
  }
}

class _GstReport extends StatefulWidget {
  const _GstReport();

  @override
  State<_GstReport> createState() => _GstReportState();
}

class _GstReportState extends State<_GstReport> {
  DateTime _from = DateTime.now().subtract(const Duration(days: 29));
  DateTime _to = DateTime.now();
  Map<String, dynamic>? _data;
  List<dynamic> _breakdown = [];
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
      final response = await ApiService.get('/reports/gst',
          queryParameters: {'from': fmt.format(_from), 'to': fmt.format(_to)});
      final body = response['data'] as Map<String, dynamic>? ?? response;
      setState(() {
        _data = body;
        _breakdown = body['breakdown'] as List<dynamic>? ?? [];
      });
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
        _DateRangeBar(from: _from, to: _to, onChanged: (f, t) {
          setState(() { _from = f; _to = t; });
          _load();
        }),
        const SizedBox(height: 16),
        if (_data != null) ...[
          Row(children: [
            Expanded(child: _ReportCard('Taxable Amount', _toDouble(_data!['taxable_amount']), icon: Icons.receipt_outlined, color: Colors.blue)),
            const SizedBox(width: 12),
            Expanded(child: _ReportCard('Total GST', _toDouble(_data!['total_gst']), icon: Icons.percent, color: Colors.purple)),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _ReportCard('CGST', _toDouble(_data!['cgst']), icon: Icons.call_split, color: Colors.teal)),
            const SizedBox(width: 12),
            Expanded(child: _ReportCard('SGST', _toDouble(_data!['sgst']), icon: Icons.call_split, color: Colors.teal)),
          ]),
          if (_toDouble(_data!['igst']) > 0) ...[
            const SizedBox(height: 12),
            _ReportCard('IGST', _toDouble(_data!['igst']), icon: Icons.swap_horiz, color: Colors.indigo),
          ],
          if (_breakdown.isNotEmpty) ...[
            const SizedBox(height: 20),
            const Text('GST Rate Breakdown', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 8),
            ..._breakdown.map((item) {
              final m = item as Map<String, dynamic>;
              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.purple.shade50,
                    child: Text('${m['rate']}%', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.purple.shade700)),
                  ),
                  title: Text('GST ${m['rate']}%'),
                  subtitle: Text('Taxable: ${_fmt(_toDouble(m['taxable_amount']))}'),
                  trailing: CurrencyText(_toDouble(m['gst_amount']), bold: true),
                  dense: true,
                ),
              );
            }),
          ],
        ],
      ],
    );
  }

  String _fmt(double v) => '₹${v.toStringAsFixed(2)}';

  static double _toDouble(dynamic v) {
    if (v == null) return 0;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    return double.tryParse(v.toString()) ?? 0;
  }
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
