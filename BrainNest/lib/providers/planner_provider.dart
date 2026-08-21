import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:brainnest/core/network/api_client.dart';
import 'package:brainnest/models/curriculum_model.dart';
import 'package:brainnest/providers/auth_provider.dart';
import 'package:brainnest/providers/curriculum_provider.dart';

class TaskItem {
  final String id;
  final String title;
  final String subtitle;
  final String subject;
  final String subjectColor;
  bool completed;
  final String priority;
  final String difficulty;
  final String estimatedDuration;
  final bool urgent;

  TaskItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.subject,
    required this.subjectColor,
    this.completed = false,
    required this.priority,
    required this.difficulty,
    required this.estimatedDuration,
    required this.urgent,
  });

  factory TaskItem.fromJson(Map<String, dynamic> json) {
    return TaskItem(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      subtitle: json['subtitle'] ?? '',
      subject: json['subject'] ?? '',
      subjectColor: json['subjectColor'] ?? 'primary',
      completed: json['completed'] ?? false,
      priority: json['priority'] ?? 'medium',
      difficulty: json['difficulty'] ?? 'medium',
      estimatedDuration: json['estimatedDuration'] ?? '30 mins',
      urgent: json['urgent'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'subtitle': subtitle,
      'subject': subject,
      'subjectColor': subjectColor,
      'completed': completed,
      'priority': priority,
      'difficulty': difficulty,
      'estimatedDuration': estimatedDuration,
      'urgent': urgent,
    };
  }
}

class FocusArea {
  final String id;
  final String topicId;
  final String subjectCode;
  final String subjectName;
  final String subjectColor;
  final String scoreDisplay;
  final String scoreColor;
  final String title;
  final String description;
  final String actionType;
  final String actionText;

  FocusArea({
    required this.id,
    required this.topicId,
    required this.subjectCode,
    required this.subjectName,
    required this.subjectColor,
    required this.scoreDisplay,
    required this.scoreColor,
    required this.title,
    required this.description,
    required this.actionType,
    required this.actionText,
  });

  factory FocusArea.fromJson(Map<String, dynamic> json) {
    return FocusArea(
      id: json['id'] ?? '',
      topicId: json['topicId'] ?? '',
      subjectCode: json['subjectCode'] ?? '',
      subjectName: json['subjectName'] ?? '',
      subjectColor: json['subjectColor'] ?? 'primary',
      scoreDisplay: json['scoreDisplay'] ?? '',
      scoreColor: json['scoreColor'] ?? 'outline',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      actionType: json['actionType'] ?? 'practice',
      actionText: json['actionText'] ?? '',
    );
  }
}

class PlannerProvider extends ChangeNotifier {
  List<TaskItem> _dailyTasks = [];
  List<String> _completedTopicIds = [];
  List<FocusArea> _focusAreas = [];
  int _completedCount = 0;
  int _totalCount = 0;
  int _percentage = 0;
  bool _isLoading = false;
  
  List<TaskItem> get dailyTasks => _dailyTasks;
  List<String> get completedTopicIds => _completedTopicIds;
  List<FocusArea> get focusAreas => _focusAreas;
  int get completedCount => _completedCount;
  int get totalCount => _totalCount;
  int get percentage => _percentage;
  bool get isLoading => _isLoading;

  void initialize(AuthProvider authProvider) {
    fetchProgress(authProvider.userProfile);
    fetchFocusAreas('ES-CS201');
  }

  Future<void> fetchProgress(Map<String, dynamic>? profile) async {
    if (profile == null) return;
    _isLoading = true;
    notifyListeners();

    final String semStr = profile['semester'] ?? 'Semester 1';
    final int semNum = semStr.contains('2') ? 2 : 1;

    try {
      final response = await ApiClient.get('/progress?semester=$semNum');
      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        _completedTopicIds = List<String>.from(data['completedTopicIds'] ?? []);
        _completedCount = data['completedCount'] ?? 0;
        _totalCount = data['totalCount'] ?? 0;
        _percentage = data['percentage'] ?? 0;
      }
    } catch (_) {}

    try {
      final dateStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final response = await ApiClient.get('/mood?date=$dateStr');
      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final record = data['moodRecord'];
        if (record != null && record['dailyTasks'] != null) {
          final List<dynamic> rawTasks = record['dailyTasks'];
          _dailyTasks = rawTasks.map((t) => TaskItem.fromJson(t)).toList();
        } else {
          _dailyTasks = [];
        }
      }
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchFocusAreas(String subjectCode) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiClient.get('/focus-areas?subjectCode=$subjectCode');
      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final List<dynamic> raw = data['focusAreas'] ?? [];
        _focusAreas = raw.map((f) => FocusArea.fromJson(f)).toList();
      }
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  Future<void> toggleTopicProgress(String topicId, AuthProvider authProvider) async {
    final cleanId = _getCanonicalId(topicId);
    final isDone = _completedTopicIds.any((id) => id == topicId || _getCanonicalId(id) == cleanId);

    if (isDone) {
      _completedTopicIds.removeWhere((id) => id == topicId || _getCanonicalId(id) == cleanId);
    } else {
      _completedTopicIds.add(topicId);
      if (cleanId.isNotEmpty) _completedTopicIds.add(cleanId);
    }
    
    for (var task in _dailyTasks) {
      if (task.id == topicId || _getCanonicalId(task.id) == cleanId) {
        task.completed = !isDone;
      }
    }

    notifyListeners();

    try {
      final dateStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
      await ApiClient.post('/mood', {
        'date': dateStr,
        'dailyTasks': _dailyTasks.map((t) => t.toJson()).toList(),
      });
    } catch (_) {}

    final String semStr = authProvider.userProfile?['semester'] ?? 'Semester 1';
    final int semNum = semStr.contains('2') ? 2 : 1;

    try {
      final response = await ApiClient.post('/progress/toggle', {
        'topicId': topicId,
        'semester': semNum,
      });
      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        _completedTopicIds = List<String>.from(data['completedTopicIds'] ?? []);
        _completedCount = data['completedCount'] ?? 0;
        _totalCount = data['totalCount'] ?? 0;
        _percentage = data['percentage'] ?? 0;
      }
    } catch (_) {}

    notifyListeners();
  }

  String _getCanonicalId(String id) {
    String clean = id.replaceAll(RegExp(r'^(task-|makaut-|custom-)'), '');
    clean = clean.replaceAll(RegExp(r'-\d+$'), '');
    return clean;
  }

  Future<void> generatePlan(String mood, String subjectCode, CurriculumProvider curriculumProvider) async {
    final allTopics = curriculumProvider.topics;
    
    final subjectTopics = allTopics.where((t) => t.subjectCode == subjectCode).toList();

    final scored = subjectTopics.map((topic) {
      int score = 0;

      if (topic.moodSuitability.contains(mood)) {
        score += 40;
      }

      if (mood == 'great') {
        if (topic.difficulty == 'hard') score += 35;
        if (topic.difficulty == 'medium') score += 15;
      } else if (mood == 'good') {
        if (topic.difficulty == 'medium') score += 30;
        if (topic.difficulty == 'hard') score += 20;
      } else if (mood == 'okay') {
        if (topic.difficulty == 'easy') score += 25;
        if (topic.difficulty == 'medium') score += 20;
        if (topic.difficulty == 'hard') score -= 15;
      } else if (mood == 'low') {
        if (topic.difficulty == 'easy') score += 35;
        if (topic.difficulty == 'hard') score -= 30;
      } else if (mood == 'sad') {
        if (topic.difficulty == 'easy') score += 40;
        if (topic.difficulty == 'hard') score -= 40;
      }

      if (topic.priority == 'high') score += 15;

      return _ScoredTopic(topic: topic, score: score);
    }).toList();

    scored.sort((a, b) => b.score.compareTo(a.score));

    int targetCount = 3;
    if (mood == 'great') targetCount = 4;
    if (mood == 'low' || mood == 'sad' || mood == 'stressed') targetCount = 2;

    final selected = scored.take(targetCount).toList();

    _dailyTasks = selected.map((item) {
      final topic = item.topic;
      final cleanId = _getCanonicalId(topic.id);
      final isCompleted = _completedTopicIds.any((id) => id == topic.id || _getCanonicalId(id) == cleanId);

      String displayTitle = topic.topic;
      String displaySubtitle = "${topic.module} • ${topic.estimatedDuration}";

      if (mood == 'sad' && topic.difficulty == 'hard') {
        displayTitle = "Review short notes for ${topic.topic}";
        displaySubtitle = "Urgent Exam Prep (${topic.subjectCode}) • 15 min gentle step";
      } else if (mood == 'stressed') {
        displayTitle = "Calm Focus: ${topic.topic}";
        displaySubtitle = "${topic.module} • 15 min step";
      }

      return TaskItem(
        id: topic.id,
        title: displayTitle,
        subtitle: displaySubtitle,
        subject: topic.subjectCode,
        subjectColor: topic.subjectColor,
        completed: isCompleted,
        priority: topic.priority,
        difficulty: topic.difficulty,
        estimatedDuration: topic.estimatedDuration,
        urgent: mood == 'stressed',
      );
    }).toList();

    notifyListeners();

    try {
      final dateStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
      await ApiClient.post('/mood', {
        'mood': mood,
        'selectedSubjectCode': subjectCode,
        'date': dateStr,
        'dailyTasks': _dailyTasks.map((t) => t.toJson()).toList(),
      });
    } catch (_) {}

    notifyListeners();
  }
}

class _ScoredTopic {
  final CurriculumTopic topic;
  final int score;
  _ScoredTopic({required this.topic, required this.score});
}

