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
    _isLoading = true;
    notifyListeners();

    final token = await SecureStorage.getToken();
    final cachedUser = await SecureStorage.getUser();

    if (token != null && token.isNotEmpty && cachedUser != null) {
      _isAuthenticated = true;
      _userProfile = cachedUser;
      // Fetch latest profile in background
      fetchProfile();
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchProfile() async {
    try {
      final response = await ApiClient.get('/users/profile');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['profile'] != null) {
          _userProfile = data['profile'];
          await SecureStorage.saveUser(_userProfile!);
          notifyListeners();
        }
      }
    } catch (_) {}
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiClient.post('/auth/login', {
        'email': email,
        'password': password,
      });

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final token = data['token'];
        _userProfile = data['profile'];

        await SecureStorage.saveToken(token);
        if (_userProfile != null) {
          await SecureStorage.saveStudentId(studentId!);
          await SecureStorage.saveUser(_userProfile!);
        }

        _isAuthenticated = true;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = data['error'] ?? 'Login failed. Please try again.';
      }
    } catch (e) {
      _errorMessage = 'Connection error. Please verify the backend is running.';
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

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final token = data['token'];
        _userProfile = data['profile'];

        await SecureStorage.saveToken(token);
        if (_userProfile != null) {
          await SecureStorage.saveStudentId(studentId!);
          await SecureStorage.saveUser(_userProfile!);
        }

        _isAuthenticated = true;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = data['error'] ?? 'Registration failed. Please check input.';
      }
    } catch (e) {
      _errorMessage = 'Connection error. Please try again later.';
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
    try {
      await ApiClient.post('/auth/logout', {});
    } catch (_) {}
    await SecureStorage.clearAll();
    _isAuthenticated = false;
    _userProfile = null;
    notifyListeners();
  }
}
