import 'dart:convert';
import 'package:flutter/material.dart';
import '../core/network/api_client.dart';
import 'auth_provider.dart';

class StudySession {
  final String topicId;
  final String subjectCode;
  final int durationMs;
  final int startedAt;
  final int endedAt;
  final String date;
  final int createdAt;

  StudySession({
    required this.topicId,
    required this.subjectCode,
    required this.durationMs,
    required this.startedAt,
    required this.endedAt,
    required this.date,
    required this.createdAt,
  });

  factory StudySession.fromJson(Map<String, dynamic> json) {
    return StudySession(
      topicId: json['topicId'] ?? '',
      subjectCode: json['subjectCode'] ?? '',
      durationMs: json['durationMs'] ?? 0,
      startedAt: json['startedAt'] ?? 0,
      endedAt: json['endedAt'] ?? 0,
      date: json['date'] ?? '',
      createdAt: json['createdAt'] ?? 0,
    );
  }
}

class StudyStatsProvider extends ChangeNotifier {
  String _hoursStudied = '0h';
  String _streakDays = '0 Days';
  int _streakCount = 0;
  List<StudySession> _sessions = [];
  bool _isLoading = false;
  String? _errorMessage;

  String get hoursStudied => _hoursStudied;
  String get streakDays => _streakDays;
  int get streakCount => _streakCount;
  List<StudySession> get sessions => _sessions;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  void initialize(AuthProvider authProvider) {
    fetchStats(authProvider.userProfile);
  }

  Future<void> fetchStats(Map<String, dynamic>? profile) async {
    if (profile == null) return;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // 1. Fetch study stats (streak & hours)
      final statsResponse = await ApiClient.get('/study-stats');
      if (statsResponse.statusCode == 200) {
        final statsData = jsonDecode(statsResponse.body);
        if (statsData['success'] == true) {
          _hoursStudied = statsData['hoursStudied'] ?? '0h';
          _streakDays = statsData['streakDays'] ?? '0 Days';
          _streakCount = statsData['streakCount'] ?? 0;
        }
      }

      // 2. Fetch study sessions history
      final sessionsResponse = await ApiClient.get('/study-sessions');
      if (sessionsResponse.statusCode == 200) {
        final sessionsData = jsonDecode(sessionsResponse.body);
        if (sessionsData['success'] == true) {
          final List<dynamic> raw = sessionsData['sessions'] ?? [];
          _sessions = raw.map((s) => StudySession.fromJson(s)).toList();
        }
      }
    } catch (e) {
      _errorMessage = 'Failed to load study statistics.';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> recordStudySession({
    required String topicId,
    required String subjectCode,
    required int durationMs,
    required int startedAt,
    required int endedAt,
    required String date,
  }) async {
    try {
      final response = await ApiClient.post('/study-sessions/record', {
        'topicId': topicId,
        'subjectCode': subjectCode,
        'durationMs': durationMs,
        'startedAt': startedAt,
        'endedAt': endedAt,
        'date': date,
      });

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        final session = StudySession.fromJson(data['session']);
        _sessions.insert(0, session);
        notifyListeners();
        return true;
      }
    } catch (_) {}
    return false;
  }
}
