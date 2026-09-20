import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

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
      'pin': password,
    });
  }

  Future<Map<String, dynamic>> syncInventory({required Map<String, dynamic> user}) async {
    return _post({
      'action': 'syncAll',
      'user': user,
    });
  }

  Future<Map<String, dynamic>> saveMovement(Map<String, dynamic> movement, {required Map<String, dynamic> user}) async {
    return _post({
      'action': 'saveMovement',
      'movement': movement,
      'user': user,
    });
  }

  Future<Map<String, dynamic>> checkDuplicateImei({
    String? imei1,
    String? imei2,
    String? serialNumber,
    String? excludeId,
  }) async {
    return _post({
      'action': 'checkDuplicateImei',
      'imei1': imei1,
      'imei2': imei2,
      'serialNumber': serialNumber,
      'excludeId': excludeId,
    });
  }

  Future<Map<String, dynamic>> validateOcrCandidate(Map<String, dynamic> candidate) async {
    return _post({'action': 'validateOcrCandidate', ...candidate});
  }

  Future<Map<String, dynamic>> matchTransferScan({
    required String transferRef,
    required List<String> scannedImeis,
  }) async {
    return _post({
      'action': 'matchTransferScan',
      'transferRef': transferRef,
      'scannedImeis': scannedImeis,
    });
  }

  Future<Map<String, dynamic>> reconcilePayment(String invoiceNo) async {
    return _post({'action': 'reconcilePayment', 'invoiceNo': invoiceNo});
  }

  Future<Map<String, dynamic>> exportAuditReport({String? from, String? to}) async {
    return _post({'action': 'exportAuditReport', 'from': from, 'to': to});
  }

  Future<List<Map<String, dynamic>>> flushQueuedRequests() async {
    final preferences = await SharedPreferences.getInstance();
    final rawQueue = preferences.getStringList('stockflow_sync_queue') ?? [];
    final remaining = <String>[];
    final results = <Map<String, dynamic>>[];
    for (final raw in rawQueue) {
      final payload = Map<String, dynamic>.from(jsonDecode(raw) as Map);
      final result = await _post(payload, queueOnFailure: false);
      results.add(result);
      if (result['success'] != true) remaining.add(raw);
    }
    await preferences.setStringList('stockflow_sync_queue', remaining);
    return results;
  }

  Future<Map<String, dynamic>> _post(Map<String, dynamic> payload, {bool queueOnFailure = true}) async {
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
      if (queueOnFailure && payload['action'] != 'login' && payload['action'] != 'syncAll') {
        final preferences = await SharedPreferences.getInstance();
        final queuedPayload = {...payload, 'idempotencyKey': '${payload['action']}-${DateTime.now().microsecondsSinceEpoch}'};
        final queue = preferences.getStringList('stockflow_sync_queue') ?? [];
        queue.add(jsonEncode(queuedPayload));
        await preferences.setStringList('stockflow_sync_queue', queue);
        return {'success': true, 'queued': true, 'message': 'Request queued for synchronization.'};
      }
      return {
        'success': false,
        'error': 'HTTP request failed: $e',
      };
    }
  }
}
