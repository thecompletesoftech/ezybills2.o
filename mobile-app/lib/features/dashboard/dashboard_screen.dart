import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/models/dashboard_model.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/dashboard_provider.dart';
import '../../core/widgets/currency_text.dart';
import '../../core/widgets/empty_state.dart';
import '../../core/widgets/shimmer_list.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(dashboardProvider);
    final user = ref.watch(authProvider).valueOrNull;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('EzyBills POS',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            if (user != null)
              Text('Hello, ${user.name}',
                  style: const TextStyle(fontSize: 12, color: Colors.white70)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(dashboardProvider.notifier).refresh(),
          ),
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: dashAsync.when(
        loading: () => const ShimmerList(),
        error: (e, _) => ErrorRetry(
          error: e,
          onRetry: () => ref.read(dashboardProvider.notifier).refresh(),
        ),
        data: (data) => _DashboardBody(data: data),
      ),
    );
  }
}

class _DashboardBody extends StatelessWidget {
  const _DashboardBody({required this.data});

  final DashboardModel data;

  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: () async {},
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _todayRow(context),
            const SizedBox(height: 16),
            _statsGrid(context),
            const SizedBox(height: 16),
            _weeklyChart(context),
            const SizedBox(height: 16),
            _topProducts(context),
          ],
        ),
      );

  Widget _todayRow(BuildContext context) => Row(
        children: [
          Expanded(
            child: _SummaryCard(
              label: "Today's Sales",
              value: data.todaySales,
              icon: Icons.trending_up,
              color: Colors.green,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _SummaryCard(
              label: 'Invoices Today',
              value: data.todayInvoices.toDouble(),
              icon: Icons.receipt,
              color: Colors.blue,
              isCurrency: false,
            ),
          ),
        ],
      );

  Widget _statsGrid(BuildContext context) => GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.8,
        children: [
          _SummaryCard(
            label: 'Pending Dues',
            value: data.pendingDues,
            icon: Icons.account_balance_wallet,
            color: Colors.orange,
          ),
          _SummaryCard(
            label: 'Low Stock Items',
            value: data.lowStockCount.toDouble(),
            icon: Icons.warning_amber,
            color: Colors.red,
            isCurrency: false,
          ),
          _SummaryCard(
            label: 'Total Customers',
            value: data.totalCustomers.toDouble(),
            icon: Icons.people,
            color: Colors.purple,
            isCurrency: false,
          ),
          _SummaryCard(
            label: 'This Month',
            value: data.thisMonthSales,
            icon: Icons.calendar_month,
            color: Colors.teal,
          ),
        ],
      );

  Widget _weeklyChart(BuildContext context) {
    if (data.weeklyData.isEmpty) return const SizedBox.shrink();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Weekly Sales',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            SizedBox(
              height: 160,
              child: BarChart(
                BarChartData(
                  barGroups: data.weeklyData.asMap().entries.map((e) {
                    return BarChartGroupData(x: e.key, barRods: [
                      BarChartRodData(
                        toY: e.value.sales,
                        color: Theme.of(context).colorScheme.primary,
                        width: 16,
                        borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(4)),
                      ),
                    ]);
                  }).toList(),
                  titlesData: FlTitlesData(
                    leftTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                    topTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (val, _) {
                          final idx = val.toInt();
                          if (idx >= data.weeklyData.length) {
                            return const SizedBox.shrink();
                          }
                          return Text(data.weeklyData[idx].label,
                              style: const TextStyle(fontSize: 10));
                        },
                      ),
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  gridData: const FlGridData(show: false),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _topProducts(BuildContext context) {
    if (data.topProducts.isEmpty) return const SizedBox.shrink();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Top Products',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ...data.topProducts.map(
              (p) => ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(p.productName,
                    style: const TextStyle(fontWeight: FontWeight.w500)),
                subtitle: Text('${p.quantity} units sold'),
                trailing: CurrencyText(p.totalSales, bold: true),
                dense: true,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.label,
    required this.value,
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
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(label,
                        style: const TextStyle(
                            fontSize: 11, color: Colors.grey),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    isCurrency
                        ? CurrencyText(value,
                            bold: true,
                            style: const TextStyle(fontSize: 15))
                        : Text(value.toInt().toString(),
                            style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
}
