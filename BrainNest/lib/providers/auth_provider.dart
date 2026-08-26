import 'dart:convert';
import 'package:flutter/material.dart';
import '../core/network/api_client.dart';
import '../core/storage/secure_storage.dart';

class AuthProvider extends ChangeNotifier {
  bool _isAuthenticated = false;
  bool _isLoading = false;
  Map<String, dynamic>? _userProfile;
  String? _errorMessage;

  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  Map<String, dynamic>? get userProfile => _userProfile;
  String? get errorMessage => _errorMessage;

  String? get studentId => _userProfile?['studentId'] ?? _userProfile?['userId'];

  AuthProvider() {
    tryAutoLogin();
  }

  Future<void> tryAutoLogin() async {
    debugPrint('[AuthProvider] tryAutoLogin started');
    _isLoading = true;
    notifyListeners();

    try {
      final token = await SecureStorage.getToken();
      final cachedUser = await SecureStorage.getUser();
      debugPrint('[AuthProvider] tryAutoLogin: hasToken=${token != null && token.isNotEmpty}, hasCachedUser=${cachedUser != null}');

      if (token != null && token.isNotEmpty) {
        try {
          // Verify token with the server
          final response = await ApiClient.get('/auth/me', timeout: const Duration(seconds: 8));
          debugPrint('[AuthProvider] tryAutoLogin /auth/me status: ${response.statusCode}');

          if (response.statusCode == 200) {
            final data = jsonDecode(response.body) as Map<String, dynamic>;
            if (data['success'] == true && data['authenticated'] == true && data['profile'] != null) {
              _isAuthenticated = true;
              _userProfile = data['profile'] as Map<String, dynamic>;
              await SecureStorage.saveUser(_userProfile!);
              debugPrint('[AuthProvider] tryAutoLogin verified. studentId=${studentId}');
              _isLoading = false;
              notifyListeners();
              return;
            }
            // authenticated=false from server means token is stale
            debugPrint('[AuthProvider] tryAutoLogin: server says not authenticated. Clearing.');
          } else if (response.statusCode == 401) {
            // Token explicitly rejected by server
            debugPrint('[AuthProvider] tryAutoLogin: 401 — token rejected by server. Clearing.');
          } else {
            // Server error (5xx) — don't clear valid session, fall back to cached user
            debugPrint('[AuthProvider] tryAutoLogin: server error ${response.statusCode} — using cached session.');
            if (cachedUser != null) {
              _isAuthenticated = true;
              _userProfile = cachedUser;
              _isLoading = false;
              notifyListeners();
              return;
            }
          }
        } catch (networkErr) {
          // Network unavailable / timeout — if we have a cached user, restore session optimistically
          debugPrint('[AuthProvider] tryAutoLogin: network error ($networkErr) — using cached session if available.');
          if (cachedUser != null) {
            _isAuthenticated = true;
            _userProfile = cachedUser;
            _isLoading = false;
            notifyListeners();
            return;
          }
        }
      }
    } catch (e) {
      debugPrint('[AuthProvider] tryAutoLogin unexpected error: $e');
    }

    // No valid token / server rejected it / no cached fallback
    debugPrint('[AuthProvider] tryAutoLogin: no valid session. Clearing storage.');
    await SecureStorage.clearAll();
    _isAuthenticated = false;
    _userProfile = null;
    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchProfile() async {
    debugPrint('[AuthProvider] fetchProfile started');
    try {
      final response = await ApiClient.get('/users/profile');
      debugPrint('[AuthProvider] fetchProfile response code: ${response.statusCode}');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['profile'] != null) {
          _userProfile = data['profile'];
          await SecureStorage.saveUser(_userProfile!);
          debugPrint('[AuthProvider] fetchProfile updated profile: $_userProfile');
          notifyListeners();
        }
      } else if (response.statusCode == 401) {
        debugPrint('[AuthProvider] fetchProfile 401 Unauthorized. Logging out.');
        await logout();
      }
    } catch (e) {
      debugPrint('[AuthProvider] Error in fetchProfile: $e');
    }
  }

  Future<bool> login(String email, String password) async {
    debugPrint('[AuthProvider] login started. endpoint=${ApiClient.baseUrl}/auth/login');
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiClient.post('/auth/login', {
        'email': email,
        'password': password,
      });
      debugPrint('[AuthProvider] login response code: ${response.statusCode}');

      Map<String, dynamic> data;
      try {
        data = jsonDecode(response.body) as Map<String, dynamic>;
      } catch (_) {
        _errorMessage = 'Server returned an unexpected response. Please try again.';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      if (response.statusCode == 200 && data['success'] == true) {
        final token = data['token'];
        _userProfile = data['profile'] as Map<String, dynamic>?;
        debugPrint('[AuthProvider] login success. studentId=${_userProfile?["studentId"]}');

        if (token != null) await SecureStorage.saveToken(token);
        if (_userProfile != null) {
          if (studentId != null) await SecureStorage.saveStudentId(studentId!);
          await SecureStorage.saveUser(_userProfile!);
        }

        _isAuthenticated = true;
        _isLoading = false;
        notifyListeners();
        return true;
      }

      // Map HTTP status codes to meaningful messages
      final serverMsg = data['error'] as String?;
      switch (response.statusCode) {
        case 400:
          _errorMessage = serverMsg ?? 'Email and password are required.';
        case 401:
          _errorMessage = serverMsg ?? 'Invalid email or password.';
        case 429:
          _errorMessage = serverMsg ?? 'Too many login attempts. Please wait a moment and try again.';
        case 500:
        case 502:
        case 503:
          _errorMessage = 'Server error (${response.statusCode}). Please try again later.';
        default:
          _errorMessage = serverMsg ?? 'Login failed (${response.statusCode}). Please try again.';
      }
      debugPrint('[AuthProvider] login failed [${response.statusCode}]: $_errorMessage');
    } catch (e) {
      debugPrint('[AuthProvider] login exception: $e');
      final errStr = e.toString();
      if (errStr.contains('TimeoutException') || errStr.contains('timeout')) {
        _errorMessage = 'Unable to connect to the BrainNest server. Please make sure the backend is running and your phone is connected to the same Wi-Fi network as your computer.';
      } else if (errStr.contains('SocketException') || errStr.contains('Connection refused') ||
                 errStr.contains('Failed host lookup') || errStr.contains('Network is unreachable')) {
        _errorMessage = 'Cannot reach the server. Check your network connection.';
      } else {
        _errorMessage = 'Unexpected error: ${e.runtimeType}. Please try again.';
      }
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> register({
    required String email,
    required String password,
    required String name,
    required String course,
    required String branch,
    required String bio,
  }) async {
    debugPrint('[AuthProvider] register started for $email');
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiClient.post('/auth/register', {
        'email': email,
        'password': password,
        'name': name,
        'course': course,
        'branch': branch,
        'bio': bio,
      });

      debugPrint('[AuthProvider] register response code: ${response.statusCode}');
      debugPrint('[AuthProvider] register response body: ${response.body}');

      Map<String, dynamic> data;
      try {
        data = jsonDecode(response.body) as Map<String, dynamic>;
      } catch (parseErr) {
        debugPrint('[AuthProvider] register: failed to parse response JSON: $parseErr');
        _errorMessage = 'Server returned an unexpected response. Please try again.';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      if ((response.statusCode == 200 || response.statusCode == 201) && data['success'] == true) {
        final token = data['token'];
        _userProfile = data['profile'];
        debugPrint('[AuthProvider] register success. studentId=${_userProfile?["studentId"]}');

        await SecureStorage.saveToken(token);
        if (_userProfile != null) {
          if (studentId != null) {
            await SecureStorage.saveStudentId(studentId!);
          }
          await SecureStorage.saveUser(_userProfile!);
        }

        _isAuthenticated = true;
        _isLoading = false;
        notifyListeners();
        return true;
      }

      final serverMsg = data['error'] as String?;
      switch (response.statusCode) {
        case 400:
          _errorMessage = serverMsg ?? 'Validation failed. Please check your details.';
          break;
        case 401:
          _errorMessage = serverMsg ?? 'Authentication error.';
          break;
        case 409:
          _errorMessage = serverMsg ?? 'An account with this email already exists.';
          break;
        case 500:
        case 502:
        case 503:
          _errorMessage = 'Server error (${response.statusCode}). Please try again later.';
          break;
        default:
          _errorMessage = serverMsg ?? 'Registration failed (${response.statusCode}). Please try again.';
      }
      debugPrint('[AuthProvider] register failed [${response.statusCode}]: $_errorMessage');
    } catch (e) {
      debugPrint('[AuthProvider] register exception: $e');
      final errStr = e.toString();
      if (errStr.contains('TimeoutException') || errStr.contains('timeout')) {
        _errorMessage = 'Unable to connect to the BrainNest server. Please make sure the backend is running and your phone is connected to the same Wi-Fi network as your computer.';
      } else if (errStr.contains('SocketException') || errStr.contains('Connection refused') ||
                 errStr.contains('Failed host lookup') || errStr.contains('Network is unreachable')) {
        _errorMessage = 'Cannot reach the server. Check your network connection.';
      } else {
        _errorMessage = 'Connection error: ${e.runtimeType}. Please try again later.';
      }
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> updateProfile({
    required String name,
    required String course,
    required String branch,
    required String bio,
    String? avatarUrl,
    String? collegeName,
    String? makautRollNumber,
    String? phoneNumber,
    String? dateOfBirth,
    String? year,
    String? semester,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiClient.put('/users/profile', {
        'studentId': studentId,
        'name': name,
        'course': course,
        'branch': branch,
        'bio': bio,
        if (avatarUrl != null) 'avatarUrl': avatarUrl,
        if (collegeName != null) 'collegeName': collegeName,
        if (makautRollNumber != null) 'makautRollNumber': makautRollNumber,
        if (phoneNumber != null) 'phoneNumber': phoneNumber,
        if (dateOfBirth != null) 'dateOfBirth': dateOfBirth,
        if (year != null) 'year': year,
        if (semester != null) 'semester': semester,
      });

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        _userProfile = data['profile'];
        if (_userProfile != null) {
          await SecureStorage.saveUser(_userProfile!);
        }
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = data['error'] ?? 'Update failed.';
      }
    } catch (e) {
      _errorMessage = 'Connection error. Update failed.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> logout() async {
    debugPrint('[AuthProvider] logout called');
    try {
      await ApiClient.post('/auth/logout', {});
    } catch (_) {}
    await SecureStorage.clearAll();
    _isAuthenticated = false;
    _userProfile = null;
    debugPrint('[AuthProvider] logout completed. _isAuthenticated=false');
    notifyListeners();
  }
}
