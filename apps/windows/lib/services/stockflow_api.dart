import 'dart:convert';

import 'package:http/http.dart' as http;

class StockFlowApiClient {
  const StockFlowApiClient();

  static const String defaultUrl = String.fromEnvironment(
    'STOCKFLOW_API_URL',
    defaultValue: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  );

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    return _post({
      'action': 'login',
      'email': email,
      'password': password,
    });
  }

  Future<Map<String, dynamic>> syncInventory() async {
    return _post({
      'action': 'syncAll',
      'user': {
        'email': 'system@stockflow.internal',
        'role': 'Super Admin',
        'name': 'System',
      },
    });
  }

  Future<Map<String, dynamic>> saveMovement(Map<String, dynamic> movement) async {
    return _post({
      'action': 'saveMovement',
      'movement': movement,
      'user': {
        'email': 'system@stockflow.internal',
        'role': 'Super Admin',
        'name': 'System',
      },
    });
  }

  Future<Map<String, dynamic>> _post(Map<String, dynamic> payload) async {
    try {
      final response = await http
          .post(
            Uri.parse(defaultUrl),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 20));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          return decoded;
        }

        return {
          'success': true,
          'payload': decoded,
        };
      }

      return {
        'success': false,
        'error': 'Request failed: ${response.statusCode} ${response.reasonPhrase}',
      };
    } catch (e) {
      return {
        'success': false,
        'error': 'HTTP request failed: $e',
      };
    }
  }
}
