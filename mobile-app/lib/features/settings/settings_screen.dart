import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/business_provider.dart';
import '../../core/providers/subscription_provider.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/app_text_field.dart';
import 'printer_settings_screen.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _gstController = TextEditingController();
  final _upiController = TextEditingController();
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    final business = ref.read(businessProvider).valueOrNull;
    if (business != null) {
      _nameController.text = business.name;
      _phoneController.text = business.mobileNumber ?? '';
      _gstController.text = business.gstNumber ?? '';
      _upiController.text = business.upiId ?? '';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _gstController.dispose();
    _upiController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _loading = true);
    try {
      await ref.read(businessProvider.notifier).updateBusiness({
        'name': _nameController.text.trim(),
        'mobile_number': _phoneController.text.trim(),
        'gst_number': _gstController.text.trim(),
        'upi_id': _upiController.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Settings saved')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Logout', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirm == true && mounted) {
      await ref.read(authProvider.notifier).logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).valueOrNull;
    final business = ref.watch(businessProvider).valueOrNull;
    final subAsync = ref.watch(subscriptionProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Account ──────────────────────────────────────────────────────
          if (user != null) ...[
            _sectionHeader('Account'),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: CircleAvatar(
                      backgroundColor: const Color(0xFF0066CC),
                      child: Text(
                        user.name[0].toUpperCase(),
                        style: const TextStyle(color: Colors.white),
                      ),
                    ),
                    title: Text(user.name,
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text(user.email ?? user.phone ?? ''),
                  ),
                  const Divider(height: 0),
                  ListTile(
                    leading: const Icon(Icons.badge_outlined),
                    title: Text(user.role.replaceAll('_', ' ').toUpperCase()),
                    subtitle: const Text('Role'),
                    dense: true,
                  ),
                  if (business != null) ...[
                    const Divider(height: 0),
                    ListTile(
                      leading: const Icon(Icons.store_outlined),
                      title: Text(business.name),
                      subtitle: const Text('Business'),
                      dense: true,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          // ── My Plan ───────────────────────────────────────────────────────
          _sectionHeader('My Plan'),
          subAsync.when(
            loading: () => const Card(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
            error: (e, _) => Card(
              child: ListTile(
                leading: const Icon(Icons.error_outline, color: Colors.red),
                title: const Text('Could not load plan'),
                subtitle: Text(e.toString()),
                trailing: IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () =>
                      ref.read(subscriptionProvider.notifier).refresh(),
                ),
              ),
            ),
            data: (sub) => _PlanCard(sub: sub),
          ),
          const SizedBox(height: 20),

          // ── Business Information ──────────────────────────────────────────
          _sectionHeader('Business Information'),
          AppTextField(label: 'Business Name', controller: _nameController),
          const SizedBox(height: 12),
          AppTextField(
            label: 'Mobile Number',
            controller: _phoneController,
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 12),
          AppTextField(label: 'GST Number', controller: _gstController),
          const SizedBox(height: 12),
          AppTextField(label: 'UPI ID', controller: _upiController),
          const SizedBox(height: 24),
          AppButton(label: 'Save Changes', onPressed: _save, loading: _loading),

          // ── App Settings ─────────────────────────────────────────────────
          const SizedBox(height: 20),
          _sectionHeader('App Settings'),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.print_outlined),
                  title: const Text('Printer Settings'),
                  subtitle: const Text('Paper size, connection, bill options'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const PrinterSettingsScreen(),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Logout ────────────────────────────────────────────────────────
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _logout,
            icon: const Icon(Icons.logout, color: Colors.red),
            label: const Text('Logout',
                style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Colors.red),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _sectionHeader(String title) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
      );
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.sub});

  final SubscriptionStatus? sub;

  @override
  Widget build(BuildContext context) {
    if (sub == null || sub!.isTrial) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(Icons.info_outline, color: Colors.orange.shade700),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Free Trial',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 15)),
                    SizedBox(height: 2),
                    Text('Upgrade to a paid plan for full access.',
                        style: TextStyle(color: Colors.grey, fontSize: 12)),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }

    final plan = sub!.plan;
    final expires = sub!.expiresAt;
    final days = sub!.daysLeft;
    final isExpired = !sub!.isActive;

    Color statusColor;
    IconData statusIcon;
    String statusText;

    if (isExpired) {
      statusColor = Colors.red;
      statusIcon = Icons.cancel_outlined;
      statusText = 'Expired';
    } else if (days <= 7) {
      statusColor = Colors.orange;
      statusIcon = Icons.warning_amber_outlined;
      statusText = '$days day${days == 1 ? '' : 's'} left';
    } else {
      statusColor = Colors.green;
      statusIcon = Icons.check_circle_outline;
      statusText = '$days days left';
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    plan?.name ?? 'Subscribed Plan',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(statusIcon, size: 14, color: statusColor),
                      const SizedBox(width: 4),
                      Text(
                        statusText,
                        style: TextStyle(
                            color: statusColor,
                            fontWeight: FontWeight.w600,
                            fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (plan != null) ...[
              const SizedBox(height: 4),
              Text(
                plan.formattedPrice,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
              ),
            ],
            if (expires != null) ...[
              const SizedBox(height: 4),
              Text(
                'Expires: ${DateFormat('dd MMM yyyy').format(expires)}',
                style: TextStyle(
                    color: isExpired ? Colors.red : Colors.grey.shade600,
                    fontSize: 13),
              ),
            ],
            if (plan != null && plan.features.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Divider(height: 0),
              const SizedBox(height: 12),
              const Text('Features',
                  style: TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              ...plan.features.map(
                (f) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.check, size: 16, color: Colors.green),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(f,
                            style: const TextStyle(fontSize: 13)),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
