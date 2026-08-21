import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  static const _storage = FlutterSecureStorage();
  
  static const _keyToken = 'auth_token';
  static const _keyStudentId = 'student_id';
  static const _keyUser = 'user_data';

  static Future<void> saveToken(String token) async {
    await _storage.write(key: _keyToken, value: token);
  }

  static Future<String?> getToken() async {
    return await _storage.read(key: _keyToken);
  }

  static Future<void> saveStudentId(String id) async {
    await _storage.write(key: _keyStudentId, value: id);
  }

  static Future<String?> getStudentId() async {
    return await _storage.read(key: _keyStudentId);
  }

  static Future<void> saveUser(Map<String, dynamic> user) async {
    await _storage.write(key: _keyUser, value: jsonEncode(user));
  }

  static Future<Map<String, dynamic>?> getUser() async {
    final rawUser = await _storage.read(key: _keyUser);
    if (rawUser != null) {
      try {
        return jsonDecode(rawUser) as Map<String, dynamic>;
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  static Future<void> clearAll() async {
    await _storage.delete(key: _keyToken);
    await _storage.delete(key: _keyStudentId);
    await _storage.delete(key: _keyUser);
  }
}
