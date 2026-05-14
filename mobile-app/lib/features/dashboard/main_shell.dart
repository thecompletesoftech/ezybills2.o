import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../billing/pos_screen.dart';
import '../inventory/product_list_screen.dart';
import '../customers/customer_list_screen.dart';
import '../settings/more_screen.dart';
import 'dashboard_screen.dart';

final _tabIndexProvider = StateProvider<int>((ref) => 0);

class MainShell extends ConsumerWidget {
  const MainShell({super.key});

  static const _tabs = [
    NavigationDestination(
        icon: Icon(Icons.dashboard_outlined),
        selectedIcon: Icon(Icons.dashboard),
        label: 'Dashboard'),
    NavigationDestination(
        icon: Icon(Icons.point_of_sale_outlined),
        selectedIcon: Icon(Icons.point_of_sale),
        label: 'POS'),
    NavigationDestination(
        icon: Icon(Icons.inventory_2_outlined),
        selectedIcon: Icon(Icons.inventory_2),
        label: 'Inventory'),
    NavigationDestination(
        icon: Icon(Icons.people_outline),
        selectedIcon: Icon(Icons.people),
        label: 'Customers'),
    NavigationDestination(
        icon: Icon(Icons.more_horiz),
        selectedIcon: Icon(Icons.more_horiz),
        label: 'More'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final index = ref.watch(_tabIndexProvider);

    final screens = [
      const DashboardScreen(),
      const PosScreen(),
      const ProductListScreen(),
      const CustomerListScreen(),
      const MoreScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: index, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) =>
            ref.read(_tabIndexProvider.notifier).state = i,
        destinations: _tabs,
        height: 64,
      ),
    );
  }
}
