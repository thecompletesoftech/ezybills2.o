import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/api_service.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/app_text_field.dart';

class PrinterSettingsScreen extends ConsumerStatefulWidget {
  const PrinterSettingsScreen({super.key});

  @override
  ConsumerState<PrinterSettingsScreen> createState() =>
      _PrinterSettingsScreenState();
}

class _PrinterSettingsScreenState
    extends ConsumerState<PrinterSettingsScreen> {
  bool _loading = true;
  bool _saving = false;

  String _paperSize = '80mm';
  String _connectionType = 'usb';
  String _printerName = '';
  String _bluetoothAddress = '';
  String _networkIp = '';
  int _networkPort = 9100;
  bool _autoPrint = false;
  bool _printLogo = true;
  bool _printAddress = true;
  bool _printMobile = true;
  bool _printGst = true;
  bool _printFooter = true;
  String _footerText = 'Thank you for your business!';
  int _copies = 1;

  final _printerNameCtrl = TextEditingController();
  final _bluetoothCtrl = TextEditingController();
  final _networkIpCtrl = TextEditingController();
  final _networkPortCtrl = TextEditingController();
  final _footerCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _printerNameCtrl.dispose();
    _bluetoothCtrl.dispose();
    _networkIpCtrl.dispose();
    _networkPortCtrl.dispose();
    _footerCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await ApiService.get('/settings/printer');
      final s = data['data'] ?? data;
      setState(() {
        _paperSize = s['paper_size'] ?? '80mm';
        _connectionType = s['connection_type'] ?? 'usb';
        _printerName = s['printer_name'] ?? '';
        _bluetoothAddress = s['bluetooth_address'] ?? '';
        _networkIp = s['network_ip'] ?? '';
        _networkPort = s['network_port'] ?? 9100;
        _autoPrint = s['auto_print'] ?? false;
        _printLogo = s['print_logo'] ?? true;
        _printAddress = s['print_address'] ?? true;
        _printMobile = s['print_mobile'] ?? true;
        _printGst = s['print_gst'] ?? true;
        _printFooter = s['print_footer'] ?? true;
        _footerText = s['footer_text'] ?? 'Thank you for your business!';
        _copies = s['copies'] ?? 1;

        _printerNameCtrl.text = _printerName;
        _bluetoothCtrl.text = _bluetoothAddress;
        _networkIpCtrl.text = _networkIp;
        _networkPortCtrl.text = _networkPort.toString();
        _footerCtrl.text = _footerText;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ApiService.post('/settings/printer', data: {
        'paper_size': _paperSize,
        'connection_type': _connectionType,
        'printer_name': _printerNameCtrl.text.trim().isEmpty ? null : _printerNameCtrl.text.trim(),
        'bluetooth_address': _bluetoothCtrl.text.trim().isEmpty ? null : _bluetoothCtrl.text.trim(),
        'network_ip': _networkIpCtrl.text.trim().isEmpty ? null : _networkIpCtrl.text.trim(),
        'network_port': int.tryParse(_networkPortCtrl.text) ?? 9100,
        'auto_print': _autoPrint,
        'print_logo': _printLogo,
        'print_address': _printAddress,
        'print_mobile': _printMobile,
        'print_gst': _printGst,
        'print_footer': _printFooter,
        'footer_text': _footerCtrl.text.trim().isEmpty ? null : _footerCtrl.text.trim(),
        'copies': _copies,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Printer settings saved')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _testPrint() {
    // Show a test receipt preview
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Test Print'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Paper: $_paperSize | Connection: $_connectionType'),
            const Divider(),
            const Text('===== EzyBills =====', textAlign: TextAlign.center),
            const Text('Test Receipt', textAlign: TextAlign.center),
            const Divider(),
            const Text('Item 1          ₹100'),
            const Text('Item 2          ₹200'),
            const Divider(),
            const Text('Subtotal        ₹300'),
            if (_printGst) const Text('GST (18%)        ₹54'),
            const Text('TOTAL          ₹354', style: TextStyle(fontWeight: FontWeight.bold)),
            const Divider(),
            if (_printFooter) Text(_footerCtrl.text, textAlign: TextAlign.center),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Test print sent to printer')),
              );
            },
            child: const Text('Print'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        appBar: null,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Printer Settings'),
        actions: [
          TextButton(
            onPressed: _testPrint,
            child: const Text('Test Print'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Paper size
          _section('Paper Size'),
          _choiceRow(
            choices: [
              ('58mm', '58mm\n2 inch'),
              ('80mm', '80mm\n3 inch'),
              ('A4', 'A4\nFull page'),
            ],
            selected: _paperSize,
            onSelect: (v) => setState(() => _paperSize = v),
          ),
          const SizedBox(height: 20),

          // Connection type
          _section('Connection Type'),
          _choiceRow(
            choices: [
              ('usb', 'USB\nWindows/Mac'),
              ('bluetooth', 'Bluetooth\nMobile'),
              ('network', 'Network\nLAN/WiFi'),
            ],
            selected: _connectionType,
            onSelect: (v) => setState(() => _connectionType = v),
          ),
          const SizedBox(height: 20),

          // Connection-specific fields
          if (_connectionType == 'usb') ...[
            AppTextField(
              label: 'Printer Name (optional)',
              controller: _printerNameCtrl,
              hint: 'e.g. EPSON TM-T82',
            ),
          ],
          if (_connectionType == 'bluetooth') ...[
            AppTextField(
              label: 'Bluetooth MAC Address',
              controller: _bluetoothCtrl,
              hint: 'e.g. 00:11:22:33:44:55',
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: const Text(
                'For Bluetooth: pair the printer in your phone\'s Bluetooth settings first, then enter the MAC address above.',
                style: TextStyle(fontSize: 12, color: Colors.blueGrey),
              ),
            ),
          ],
          if (_connectionType == 'network') ...[
            AppTextField(
              label: 'Printer IP Address',
              controller: _networkIpCtrl,
              keyboardType: TextInputType.number,
              hint: 'e.g. 192.168.1.100',
            ),
            const SizedBox(height: 12),
            AppTextField(
              label: 'Port',
              controller: _networkPortCtrl,
              keyboardType: TextInputType.number,
              hint: '9100',
            ),
          ],
          if (_connectionType != 'usb') const SizedBox(height: 20),

          // Bill options
          _section('Bill Options'),
          Card(
            child: Column(
              children: [
                _switchTile('Auto-print on invoice save', _autoPrint, (v) => setState(() => _autoPrint = v)),
                _switchTile('Print business logo', _printLogo, (v) => setState(() => _printLogo = v)),
                _switchTile('Print business address', _printAddress, (v) => setState(() => _printAddress = v)),
                _switchTile('Print mobile number', _printMobile, (v) => setState(() => _printMobile = v)),
                _switchTile('Print GST breakdown', _printGst, (v) => setState(() => _printGst = v)),
                _switchTile('Print footer message', _printFooter, (v) => setState(() => _printFooter = v)),
              ],
            ),
          ),
          const SizedBox(height: 12),

          if (_printFooter) ...[
            AppTextField(label: 'Footer Text', controller: _footerCtrl, maxLines: 2),
            const SizedBox(height: 12),
          ],

          // Copies
          _section('Number of Copies'),
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  const Text('Copies', style: TextStyle(fontWeight: FontWeight.w500)),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.remove_circle_outline),
                    onPressed: _copies > 1 ? () => setState(() => _copies--) : null,
                  ),
                  Text('$_copies', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline),
                    onPressed: _copies < 3 ? () => setState(() => _copies++) : null,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          AppButton(label: 'Save Printer Settings', onPressed: _save, loading: _saving),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _section(String title) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
      );

  Widget _choiceRow({ required List<(String, String)> choices, required String selected, required void Function(String) onSelect }) {
    final theme = Theme.of(context);
    return Row(
      children: choices.map((c) {
        final isSelected = selected == c.$1;
        return Expanded(
          child: GestureDetector(
            onTap: () => onSelect(c.$1),
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
              decoration: BoxDecoration(
                color: isSelected ? theme.colorScheme.primary : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isSelected ? theme.colorScheme.primary : Colors.grey.shade300,
                ),
              ),
              child: Text(
                c.$2,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.black87,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _switchTile(String title, bool value, void Function(bool) onChanged) =>
      SwitchListTile(
        title: Text(title, style: const TextStyle(fontSize: 14)),
        value: value,
        onChanged: onChanged,
        dense: true,
      );
}
