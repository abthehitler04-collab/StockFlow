import 'package:flutter/material.dart';
import 'services/stockflow_api.dart';

void main() => runApp(const StockFlowAndroidApp());

class StockFlowAndroidApp extends StatelessWidget {
  const StockFlowAndroidApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'StockFlow Android',
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF2563EB),
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
      return const StockFlowMobileHome();
    }

    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            margin: const EdgeInsets.all(24),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Form(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Icon(Icons.lock_outline, size: 48, color: Color(0xFF2563EB)),
                    const SizedBox(height: 16),
                    const Text(
                      'StockFlow Mobile',
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
                      'Using centralized Google Apps Script backend',
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

class StockFlowMobileHome extends StatefulWidget {
  const StockFlowMobileHome({super.key});

  @override
  State<StockFlowMobileHome> createState() => _StockFlowMobileHomeState();
}

class _StockFlowMobileHomeState extends State<StockFlowMobileHome> {
  int _selectedIndex = 0;

  final List<_NavItem> _items = const [
    _NavItem(icon: Icons.dashboard, label: 'Dashboard'),
    _NavItem(icon: Icons.inventory_2_outlined, label: 'Inventory'),
    _NavItem(icon: Icons.sync_alt, label: 'Transfers'),
    _NavItem(icon: Icons.point_of_sale, label: 'Sales'),
    _NavItem(icon: Icons.build_circle_outlined, label: 'BadBin'),
  ];

  final StockFlowApiClient _apiClient = const StockFlowApiClient();

  @override
  Widget build(BuildContext context) {
    final cards = [
      _buildDashboardCards(),
      _buildInventoryList(),
      _buildTransferList(),
      _buildSalesCards(),
      _buildRepairQueue(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('StockFlow Mobile'),
        centerTitle: false,
        actions: [
          IconButton(
            onPressed: _syncInventory,
            tooltip: 'Sync with backend',
            icon: const Icon(Icons.sync),
          ),
          const Padding(
            padding: EdgeInsets.only(right: 16),
            child: CircleAvatar(
              child: Icon(Icons.person),
            ),
          )
        ],
      ),
      body: cards[_selectedIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) => setState(() => _selectedIndex = index),
        destinations: _items
            .map((item) => NavigationDestination(
                  icon: Icon(item.icon),
                  label: item.label,
                ))
            .toList(),
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

  Widget _buildDashboardCards() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Today', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Text('API endpoint: ${StockFlowApiClient.defaultUrl}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: const [
            _MetricCard(title: 'IN', value: '162', accent: Colors.green),
            _MetricCard(title: 'OUT', value: '88', accent: Colors.orange),
            _MetricCard(title: 'Sales', value: '৳ 1,240,000', accent: Colors.blue),
            _MetricCard(title: 'Due', value: '৳ 118,200', accent: Colors.red),
          ],
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('Recent Activity', style: TextStyle(fontWeight: FontWeight.bold)),
                SizedBox(height: 12),
                Text('• Stock IN received at Main House'),
                Text('• IMEI 356... matches existing handset'),
                Text('• Transfer approved for Dhaka logistics'),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInventoryList() {
    final items = [
      {'sku': 'IPH-15-PRO', 'location': 'Main House', 'stock': '32'},
      {'sku': 'SAM-S23', 'location': 'Dhaka Hub', 'stock': '18'},
      {'sku': 'XIAO-14T', 'location': 'Retail Counter', 'stock': '7'},
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: const Icon(Icons.smartphone_outlined),
            title: Text(item['sku'] as String),
            subtitle: Text(item['location'] as String),
            trailing: Chip(label: Text('In hand: ${item['stock']}')),
          ),
        );
      },
    );
  }

  Widget _buildTransferList() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        ListTile(title: Text('TRF-20260916-001'), subtitle: Text('Dhaka Hub → Chattogram'), trailing: Chip(label: Text('Approved'))),
        ListTile(title: Text('TRF-20260916-010'), subtitle: Text('Warehouse → Service Center'), trailing: Chip(label: Text('In Transit'))),
      ],
    );
  }

  Widget _buildSalesCards() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        _MetricCard(title: 'Invoices', value: '119', accent: Colors.indigo),
        _MetricCard(title: 'Paid', value: '৳ 860,500', accent: Colors.green),
        _MetricCard(title: 'Due', value: '৳ 88,900', accent: Colors.amber),
      ],
    );
  }

  Widget _buildRepairQueue() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        ListTile(title: Text('Repair #RP-1045'), subtitle: Text('IMEI 356... | Screen issue'), trailing: Chip(label: Text('Inspection'))),
        ListTile(title: Text('Repair #RP-1048'), subtitle: Text('IMEI 863... | Battery fault'), trailing: Chip(label: Text('Waiting Parts'))),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final Color accent;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 150,
      child: Card(
        color: accent.withValues(alpha: 0.12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final String label;

  const _NavItem({required this.icon, required this.label});
}
