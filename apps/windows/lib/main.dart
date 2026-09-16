import 'package:flutter/material.dart';
import 'services/stockflow_api.dart';

void main() => runApp(const StockFlowWindowsApp());

class StockFlowWindowsApp extends StatelessWidget {
  const StockFlowWindowsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'StockFlow Windows',
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF0F172A),
        brightness: Brightness.light,
      ),
      home: const StockFlowAuthGate(),
    );
  }
}

class StockFlowAuthGate extends StatefulWidget {
  const StockFlowAuthGate({super.key});

  @override
  State<StockFlowAuthGate> createState() => _StockFlowAuthGateState();
}

class _StockFlowAuthGateState extends State<StockFlowAuthGate> {
  final _emailController = TextEditingController(text: 'manager@stockflow.local');
  final _passwordController = TextEditingController(text: 'demo123');
  final _apiClient = const StockFlowApiClient();
  bool _isLoading = false;
  bool _isAuthenticated = false;

  Future<void> _login() async {
    setState(() => _isLoading = true);

    final response = await _apiClient.login(
      email: _emailController.text.trim(),
      password: _passwordController.text,
    );

    if (!mounted) return;

    setState(() => _isLoading = false);

    if (response['success'] == true) {
      setState(() => _isAuthenticated = true);
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(response['error'] ?? 'Login failed.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isAuthenticated) {
      return const StockFlowDesktopHome();
    }

    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460),
          child: Card(
            margin: const EdgeInsets.all(24),
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Form(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Icon(Icons.desktop_windows_outlined, size: 48, color: Color(0xFF0F172A)),
                    const SizedBox(height: 16),
                    const Text(
                      'StockFlow Desktop',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 24),
                    TextFormField(
                      controller: _emailController,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'Password',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 24),
                    FilledButton.icon(
                      onPressed: _isLoading ? null : _login,
                      icon: _isLoading
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.login),
                      label: Text(_isLoading ? 'Signing in...' : 'Sign in'),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Centralized backend sync ready',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class StockFlowDesktopHome extends StatefulWidget {
  const StockFlowDesktopHome({super.key});

  @override
  State<StockFlowDesktopHome> createState() => _StockFlowDesktopHomeState();
}

class _StockFlowDesktopHomeState extends State<StockFlowDesktopHome> {
  int _selectedIndex = 0;

  final List<_MenuItem> _items = const [
    _MenuItem(icon: Icons.dashboard, label: 'Dashboard'),
    _MenuItem(icon: Icons.inventory_2, label: 'Inventory'),
    _MenuItem(icon: Icons.swap_horiz, label: 'Transfers'),
    _MenuItem(icon: Icons.receipt_long, label: 'Sales'),
    _MenuItem(icon: Icons.settings, label: 'Settings'),
  ];

  final StockFlowApiClient _apiClient = const StockFlowApiClient();

  @override
  Widget build(BuildContext context) {
    final pages = [
      _buildDashboard(),
      _buildInventoryTable(),
      _buildTransferQueue(),
      _buildSalesBoard(),
      _buildSettingsPanel(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('StockFlow Desktop'),
        actions: [
          IconButton(
            onPressed: _syncInventory,
            tooltip: 'Sync with backend',
            icon: const Icon(Icons.sync),
          )
        ],
      ),
      body: Row(
        children: [
          NavigationRail(
            selectedIndex: _selectedIndex,
            onDestinationSelected: (value) => setState(() => _selectedIndex = value),
            labelType: NavigationRailLabelType.all,
            destinations: _items
                .map((item) => NavigationRailDestination(
                    icon: Icon(item.icon),
                    label: Text(item.label),
                  ))
                .toList(),
          ),
          const VerticalDivider(width: 1),
          Expanded(
            child: pages[_selectedIndex],
          ),
        ],
      ),
    );
  }

  Future<void> _syncInventory() async {
    final result = await _apiClient.syncInventory();
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          result['success'] == true
              ? 'Backend sync request sent successfully.'
              : 'Sync failed: ${result['error'] ?? 'Unknown issue'}',
        ),
      ),
    );
  }

  Widget _buildDashboard() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: ListView(
        children: [
          const Text('StockFlow Dashboard', style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text('API endpoint: placeholder', style: TextStyle(fontSize: 12, color: Colors.grey)),
          const SizedBox(height: 20),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: const [
              _MetricTile(label: 'Today IN', value: '162', color: Colors.green),
              _MetricTile(label: 'Today OUT', value: '88', color: Colors.orange),
              _MetricTile(label: 'In Hand', value: '9,420', color: Colors.blue),
              _MetricTile(label: 'Pending Transfers', value: '14', color: Colors.purple),
              _MetricTile(label: 'Sales Today', value: '৳ 1.24M', color: Colors.teal),
              _MetricTile(label: 'Low Stock', value: '23', color: Colors.red),
            ],
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('Operations Summary', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                  SizedBox(height: 12),
                  Text('• 6 new stock entries were received this morning'),
                  Text('• 2 transfers are awaiting approval'),
                  Text('• BadBin service queue has 5 active repair tickets'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInventoryTable() {
    final rows = [
      {'sku': 'IPH-15-PRO', 'brand': 'Apple', 'location': 'Main House', 'stock': '32'},
      {'sku': 'SAM-S23', 'brand': 'Samsung', 'location': 'Dhaka Hub', 'stock': '18'},
      {'sku': 'XIAO-14T', 'brand': 'Xiaomi', 'location': 'Retail Counter', 'stock': '7'},
    ];

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Inventory Register', style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Expanded(
            child: DataTable(
              columns: const [
                DataColumn(label: Text('SKU')),
                DataColumn(label: Text('Brand')),
                DataColumn(label: Text('Location')),
                DataColumn(label: Text('In Hand')),
              ],
              rows: rows
                  .map((row) => DataRow(cells: [
                        DataCell(Text(row['sku'] as String)),
                        DataCell(Text(row['brand'] as String)),
                        DataCell(Text(row['location'] as String)),
                        DataCell(Text(row['stock'] as String)),
                      ]))
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransferQueue() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: ListView(
        children: const [
          ListTile(title: Text('TRF-20260916-001'), subtitle: Text('Main House → Dhaka Hub'), trailing: Chip(label: Text('Approved'))),
          ListTile(title: Text('TRF-20260916-010'), subtitle: Text('Main House → Service Center'), trailing: Chip(label: Text('In Transit'))),
          ListTile(title: Text('TRF-20260916-018'), subtitle: Text('Retail Counter → Khulna Store'), trailing: Chip(label: Text('Pending'))),
        ],
      ),
    );
  }

  Widget _buildSalesBoard() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: ListView(
        children: const [
          Text('Sales Board', style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold)),
          SizedBox(height: 12),
          _MetricTile(label: 'Invoices', value: '119', color: Colors.indigo),
          _MetricTile(label: 'Paid', value: '৳ 860,500', color: Colors.green),
          _MetricTile(label: 'Due', value: '৳ 88,900', color: Colors.amber),
        ],
      ),
    );
  }

  Widget _buildSettingsPanel() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: ListView(
        children: const [
          Text('Settings', style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold)),
          SizedBox(height: 16),
          ListTile(leading: Icon(Icons.person), title: Text('Profile & Security')),
          ListTile(leading: Icon(Icons.sync), title: Text('Sync Settings')),
          ListTile(leading: Icon(Icons.print), title: Text('Printer Configuration')),
          ListTile(leading: Icon(Icons.business), title: Text('Company & Locations')),
        ],
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _MetricTile({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 180,
      child: Card(
        color: color.withValues(alpha: 0.12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String label;

  const _MenuItem({required this.icon, required this.label});
}
