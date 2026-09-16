class StockFlowApiClient {
  const StockFlowApiClient();

  static const String defaultUrl = 'https://script.google.com/macros/s/AKfycbw.../exec';

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final payload = {
      'action': 'login',
      'email': email,
      'password': password,
    };

    return _post(payload);
  }

  Future<Map<String, dynamic>> syncInventory() async {
    return _post({
      'action': 'syncAll',
      'user': {'email': 'system@stockflow.internal', 'role': 'Super Admin', 'name': 'System'},
    });
  }

  Future<Map<String, dynamic>> saveMovement(Map<String, dynamic> movement) async {
    return _post({
      'action': 'saveMovement',
      'movement': movement,
      'user': {'email': 'system@stockflow.internal', 'role': 'Super Admin', 'name': 'System'},
    });
  }

  Future<Map<String, dynamic>> _post(Map<String, dynamic> payload) async {
    // Placeholder client for the production contract.
    // Replace defaultUrl with the deployed Apps Script Web App URL in production.
    return {
      'success': true,
      'payload': payload,
      'message': 'API contract ready for deployment',
    };
  }
}
