import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiConfig {
  static const _storage = FlutterSecureStorage();
  
  static const String _keyCustomIp = 'custom_pc_ip';
  static const String _keyCustomPort = 'custom_pc_port';

  static String _cachedUrl = 'http://localhost:5000/api';

  static String get baseUrl => _cachedUrl;

  static Future<String> _resolveDefaultUrl() async {
    const envUrl = String.fromEnvironment('API_BASE_URL');
    if (envUrl.isNotEmpty) {
      return envUrl;
    }

    if (kIsWeb) {
      return 'http://localhost:5000/api';
    }

    try {
      if (Platform.isAndroid) {
        try {
          final socket = await Socket.connect('10.0.2.2', 5000, timeout: const Duration(milliseconds: 500));
          socket.destroy();
          return 'http://10.0.2.2:5000/api';
        } catch (_) {
          return 'http://10.210.220.84:5000/api';
        }
      }
      if (Platform.isIOS) {
        try {
          final socket = await Socket.connect('localhost', 5000, timeout: const Duration(milliseconds: 500));
          socket.destroy();
          return 'http://localhost:5000/api';
        } catch (_) {
          return 'http://10.210.220.84:5000/api';
        }
      }
    } catch (_) {}

    return 'http://localhost:5000/api';
  }

  static Future<void> loadConfig() async {
    final customIp = await _storage.read(key: _keyCustomIp);
    final customPort = await _storage.read(key: _keyCustomPort);
    
    if (customIp != null && customIp.isNotEmpty && customPort != null && customPort.isNotEmpty) {
      _cachedUrl = 'http://${customIp.trim()}:${customPort.trim()}/api';
    } else {
      _cachedUrl = await _resolveDefaultUrl();
    }
  }

  static Future<void> setCustomConfig(String ip, String port) async {
    await _storage.write(key: _keyCustomIp, value: ip.trim());
    await _storage.write(key: _keyCustomPort, value: port.trim());
    await loadConfig();
  }

  static Future<void> clearCustomConfig() async {
    await _storage.delete(key: _keyCustomIp);
    await _storage.delete(key: _keyCustomPort);
    await loadConfig();
  }

  static Future<String?> getCustomIp() async {
    return await _storage.read(key: _keyCustomIp);
  }

  static Future<String?> getCustomPort() async {
    return await _storage.read(key: _keyCustomPort);
  }
}
