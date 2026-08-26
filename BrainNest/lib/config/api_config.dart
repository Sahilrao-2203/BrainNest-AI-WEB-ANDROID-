import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:device_info_plus/device_info_plus.dart';

/// API base URL configuration with platform-aware defaults.
///
/// Priority order (highest to lowest):
///   1. Runtime custom IP stored via [setCustomConfig] (persists across restarts).
///   2. Compile-time dart-define:  --dart-define=API_BASE_URL=http://...
///   3. Compile-time dart-define:  --dart-define=LAN_IP=192.168.x.x
///      (used for physical-device APK builds; auto-appends :5000/api)
///   4. Platform default:
///      - Flutter Web  → http://localhost:5000/api
///      - Android AVD  → http://10.0.2.2:5000/api
///      - Windows/Other → http://localhost:5000/api
///
/// To build for a physical Android device on LAN:
///   flutter build apk --debug --dart-define=LAN_IP=192.168.1.100
///   flutter run -d <device> --dart-define=LAN_IP=192.168.1.100
class ApiConfig {
  static const _storage = FlutterSecureStorage();

  static const String _keyCustomIp = 'custom_pc_ip';
  static const String _keyCustomPort = 'custom_pc_port';

  static String _cachedUrl = 'http://localhost:5000/api';

  static String get baseUrl => _cachedUrl;

  static Future<String> _resolveDefaultUrl() async {
    // 1. Full URL override via dart-define
    const envUrl = String.fromEnvironment('API_BASE_URL');
    if (envUrl.isNotEmpty) {
      return envUrl;
    }

    // 2. LAN IP override via dart-define (physical device builds)
    const lanIp = String.fromEnvironment('LAN_IP', defaultValue: '192.168.2.122');
    
    // 3. Platform defaults
    if (kIsWeb) {
      return 'http://localhost:5000/api';
    }

    if (defaultTargetPlatform == TargetPlatform.android) {
      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;
      if (androidInfo.isPhysicalDevice) {
        return 'http://$lanIp:5000/api';
      } else {
        return 'http://10.0.2.2:5000/api';
      }
    }

    return 'http://localhost:5000/api';
  }

  static Future<void> loadConfig() async {
    final customIp = await _storage.read(key: _keyCustomIp);
    final customPort = await _storage.read(key: _keyCustomPort);

    if (customIp != null && customIp.isNotEmpty &&
        customPort != null && customPort.isNotEmpty) {
      _cachedUrl = 'http://${customIp.trim()}:${customPort.trim()}/api';
    } else {
      _cachedUrl = await _resolveDefaultUrl();
    }
    debugPrint(
      '[ApiConfig] Active baseUrl: $_cachedUrl '
      '(platform: $defaultTargetPlatform, isWeb: $kIsWeb)',
    );
  }

  /// Persist a custom PC IP+port for physical-device development.
  /// Example: setCustomConfig('192.168.1.100', '5000')
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
