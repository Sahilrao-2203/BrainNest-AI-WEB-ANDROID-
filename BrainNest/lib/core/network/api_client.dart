import 'dart:convert';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:brainnest/config/api_config.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  static String get baseUrl => ApiConfig.baseUrl;
  static const Duration syllabusAnalysisTimeout = Duration(minutes: 3);

  static Map<String, String> _getHeaders(String? token) {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  static void _logDiagnostics(dynamic error, String path) {
    if (kDebugMode) {
      debugPrint('--- ApiClient Diagnostic Log ---');
      debugPrint('Path: $path');
      debugPrint('Target BaseUrl: $baseUrl');
      debugPrint('Error Details: $error');
      final errStr = error.toString();
      if (errStr.contains('SocketException') || errStr.contains('Connection refused') || errStr.contains('NetworkUnreachable')) {
        debugPrint('Diagnosis: Connection refused, wrong IP/port, or firewall block.');
        debugPrint('Checklist:');
        debugPrint('1. Is Hackathon Express server running on the PC?');
        debugPrint('2. Current LAN IP of PC matches $baseUrl?');
        debugPrint('3. Physical phone on the SAME Wi-Fi network?');
        debugPrint('4. Windows Firewall inbound rule configured for port?');
      } else if (error is TimeoutException) {
        debugPrint('Diagnosis: Connection timed out. Network latency or packet loss.');
      } else if (errStr.contains('HttpException')) {
        debugPrint('Diagnosis: Invalid HTTP protocol/host format.');
      }
      debugPrint('---------------------------------');
    }
  }

  static Future<http.Response> get(
    String path, {
    Duration timeout = const Duration(seconds: 15),
  }) async {
    try {
      final token = await SecureStorage.getToken();
      final url = Uri.parse('$baseUrl$path');
      final response = await http.get(url, headers: _getHeaders(token)).timeout(timeout);
      return response;
    } catch (e) {
      _logDiagnostics(e, path);
      rethrow;
    }
  }

  static Future<http.Response> post(
    String path,
    Map<String, dynamic> body, {
    Duration timeout = const Duration(seconds: 15),
  }) async {
    final startTime = DateTime.now();
    try {
      final token = await SecureStorage.getToken();
      final url = Uri.parse('$baseUrl$path');
      
      final response = await http.post(
        url,
        headers: _getHeaders(token),
        body: jsonEncode(body),
      ).timeout(timeout);
      
      if (kDebugMode) {
        final duration = DateTime.now().difference(startTime).inMilliseconds / 1000.0;
        debugPrint('\n[BrainNest API]');
        debugPrint('Request URL: $url');
        debugPrint('Endpoint: $path');
        debugPrint('HTTP status: ${response.statusCode}');
        debugPrint('Request duration: ${duration}s');
        debugPrint('Response status: ${response.reasonPhrase}');
        debugPrint('------------------------\n');
      }
      return response;
    } catch (e) {
      if (kDebugMode) {
        final duration = DateTime.now().difference(startTime).inMilliseconds / 1000.0;
        debugPrint('\n[BrainNest API]');
        debugPrint('Endpoint: $path');
        debugPrint('HTTP status: FAILED');
        debugPrint('Request duration: ${duration}s');
        debugPrint('Response status: ERROR - $e');
        debugPrint('------------------------\n');
      }
      _logDiagnostics(e, path);
      rethrow;
    }
  }

  static Future<http.Response> put(
    String path,
    Map<String, dynamic> body, {
    Duration timeout = const Duration(seconds: 15),
  }) async {
    try {
      final token = await SecureStorage.getToken();
      final url = Uri.parse('$baseUrl$path');
      final response = await http.put(
        url,
        headers: _getHeaders(token),
        body: jsonEncode(body),
      ).timeout(timeout);
      return response;
    } catch (e) {
      _logDiagnostics(e, path);
      rethrow;
    }
  }

  static Future<http.Response> delete(
    String path, {
    Duration timeout = const Duration(seconds: 15),
  }) async {
    try {
      final token = await SecureStorage.getToken();
      final url = Uri.parse('$baseUrl$path');
      final response = await http.delete(url, headers: _getHeaders(token)).timeout(timeout);
      return response;
    } catch (e) {
      _logDiagnostics(e, path);
      rethrow;
    }
  }
}
