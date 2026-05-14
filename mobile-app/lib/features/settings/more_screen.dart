import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/business_provider.dart';
import '../reports/reports_screen.dart';
import '../suppliers/supplier_list_screen.dart';
import '../expenses/expense_list_screen.dart';
import 'settings_screen.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).valueOrNull;
    final business = ref.watch(businessProvider).valueOrNull;
    final isRestaurant = business?.isRestaurant ?? false;

    return Scaffold(
      appBar: AppBar(title: const Text('More')),
      body: ListView(
        children: [
          if (user != null)
            ListTile(
              leading: CircleAvatar(
                child: Text(user.name[0].toUpperCase()),
              ),
              title: Text(user.name,
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text(user.role.toUpperCase()),
            ),
          const Divider(),
          _MenuItem(
            icon: Icons.bar_chart,
            label: 'Reports',
            onTap: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const ReportsScreen())),
          ),
          _MenuItem(
            icon: Icons.local_shipping,
            label: 'Suppliers',
            onTap: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const SupplierListScreen())),
          ),
          _MenuItem(
            icon: Icons.receipt_long,
            label: 'Expenses',
            onTap: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const ExpenseListScreen())),
          ),
          if (isRestaurant) ...[
            const Divider(),
            _MenuItem(
              icon: Icons.table_bar,
              label: 'Table Management',
              onTap: () {},
            ),
            _MenuItem(
              icon: Icons.kitchen,
              label: 'Kitchen Orders (KOT)',
              onTap: () {},
            ),
          ],
          const Divider(),
          _MenuItem(
            icon: Icons.settings,
            label: 'Settings',
            onTap: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const SettingsScreen())),
          ),
          _MenuItem(
            icon: Icons.logout,
            label: 'Logout',
            color: Colors.red,
            onTap: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Logout'),
                  content: const Text('Are you sure you want to logout?'),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        child: const Text('Cancel')),
                    TextButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        child: const Text('Logout',
                            style: TextStyle(color: Colors.red))),
                  ],
                ),
              );
              if (confirm == true) {
                await ref.read(authProvider.notifier).logout();
              }
            },
          ),
        ],
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  const _MenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) => ListTile(
        leading: Icon(icon, color: color),
        title:
            Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w500)),
        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
        onTap: onTap,
      );
}
