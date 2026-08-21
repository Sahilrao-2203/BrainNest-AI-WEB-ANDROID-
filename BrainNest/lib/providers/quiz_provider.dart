import 'dart:convert';
import 'package:flutter/material.dart';
import '../core/network/api_client.dart';
import 'auth_provider.dart';

class QuizQuestion {
  final String question;
  final List<String> options;
  final int correctAnswerIndex;

  QuizQuestion({
    required this.question,
    required this.options,
    required this.correctAnswerIndex,
  });

  factory QuizQuestion.fromJson(Map<String, dynamic> json) {
    return QuizQuestion(
      question: json['question'] ?? '',
      options: List<String>.from(json['options'] ?? []),
      correctAnswerIndex: json['correctAnswerIndex'] is int ? json['correctAnswerIndex'] : 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'question': question,
    'options': options,
    'correctAnswerIndex': correctAnswerIndex,
  };
}

class QuizAttempt {
  final String subjectCode;
  final String topicId;
  final String topic;
  final List<QuizQuestion> questions;
  final List<int> answers;
  final int score;
  final int correctAnswers;
  final int incorrectAnswers;
  final int totalQuestions;
  final int percentage;
  final int startedAt;
  final int completedAt;
  final int createdAt;

  QuizAttempt({
    required this.subjectCode,
    required this.topicId,
    required this.topic,
    required this.questions,
    required this.answers,
    required this.score,
    required this.correctAnswers,
    required this.incorrectAnswers,
    required this.totalQuestions,
    required this.percentage,
    required this.startedAt,
    required this.completedAt,
    required this.createdAt,
  });

  factory QuizAttempt.fromJson(Map<String, dynamic> json) {
    final List<dynamic> qRaw = json['questions'] ?? [];
    final List<dynamic> aRaw = json['answers'] ?? [];
    return QuizAttempt(
      subjectCode: json['subjectCode'] ?? '',
      topicId: json['topicId'] ?? '',
      topic: json['topic'] ?? '',
      questions: qRaw.map((q) => QuizQuestion.fromJson(q)).toList(),
      answers: List<int>.from(aRaw),
      score: json['score'] ?? 0,
      correctAnswers: json['correctAnswers'] ?? 0,
      incorrectAnswers: json['incorrectAnswers'] ?? 0,
      totalQuestions: json['totalQuestions'] ?? 0,
      percentage: json['percentage'] ?? 0,
      startedAt: json['startedAt'] ?? 0,
      completedAt: json['completedAt'] ?? 0,
      createdAt: json['createdAt'] ?? 0,
    );
  }
}

class QuizProvider extends ChangeNotifier {
  List<QuizAttempt> _attempts = [];
  Map<String, dynamic> _topicScores = {};
  bool _isLoading = false;
  String? _errorMessage;

  List<QuizAttempt> get attempts => _attempts;
  Map<String, dynamic> get topicScores => _topicScores;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  void initialize(AuthProvider authProvider) {
    fetchHistory(authProvider.userProfile);
  }

  Future<void> fetchHistory(Map<String, dynamic>? profile) async {
    if (profile == null) return;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final historyResponse = await ApiClient.get('/quiz-attempts');
      if (historyResponse.statusCode == 200) {
        final data = jsonDecode(historyResponse.body);
        if (data['success'] == true) {
          final List<dynamic> raw = data['attempts'] ?? [];
          _attempts = raw.map((a) => QuizAttempt.fromJson(a)).toList();
        }
      }

      final statsResponse = await ApiClient.get('/quiz-stats');
      if (statsResponse.statusCode == 200) {
        final data = jsonDecode(statsResponse.body);
        if (data['success'] == true) {
          _topicScores = data['topicScores'] ?? {};
        }
      }
    } catch (e) {
      _errorMessage = 'Failed to load quiz statistics.';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<List<QuizQuestion>?> generateQuiz({
    required String subjectName,
    required String subjectCode,
    required String topicName,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final prompt = 'Generate exactly 5 multiple choice questions (MCQ) for the subject "$subjectName" (code: $subjectCode), topic "$topicName". Each question must have 4 options and 1 correct answer index (0-3). Respond ONLY with a valid JSON array matching the requested schema. Do NOT wrap the JSON in markdown code blocks like ```json. Do NOT add any extra text or commentary. Verify JSON syntax.';
      
      const systemInstruction = 'You are an expert academic examiner. Your task is to generate 5 high-quality MCQs for the requested topic. You must return ONLY a JSON array conforming to this schema:\n[\n  {\n    "question": "Question text?",\n    "options": ["Option A", "Option B", "Option C", "Option D"],\n    "correctAnswerIndex": 0\n  }\n]';

      final response = await ApiClient.post(
        '/ai/chat',
        {
          'contents': [
            {
              'role': 'user',
              'parts': [{'text': prompt}]
            }
          ],
          'systemInstruction': systemInstruction,
        },
        timeout: const Duration(seconds: 60),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true && data['text'] != null) {
        String cleanText = data['text'].toString().trim();
        
        final startIdx = cleanText.indexOf('[');
        final endIdx = cleanText.lastIndexOf(']');
        if (startIdx != -1 && endIdx != -1 && endIdx > startIdx) {
          cleanText = cleanText.substring(startIdx, endIdx + 1);
        }

        final List<dynamic> parsed = jsonDecode(cleanText);
        _isLoading = false;
        notifyListeners();
        return parsed.map((q) => QuizQuestion.fromJson(q)).toList();
      } else {
        _errorMessage = data['error'] ?? 'AI Quiz generation failed.';
      }
    } catch (e) {
      _errorMessage = 'Failed to generate quiz with AI.';
    }

    _isLoading = false;
    notifyListeners();
    return null;
  }

  Future<bool> saveQuizAttempt({
    required String subjectCode,
    required String topicId,
    required String topic,
    required List<QuizQuestion> questions,
    required List<int> answers,
    required int score,
    required int correctAnswers,
    required int incorrectAnswers,
    required int totalQuestions,
    required int percentage,
    required int startedAt,
    required int completedAt,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiClient.post('/quiz-attempts', {
        'subjectCode': subjectCode,
        'topicId': topicId,
        'topic': topic,
        'questions': questions.map((q) => q.toJson()).toList(),
        'answers': answers,
        'score': score,
        'correctAnswers': correctAnswers,
        'incorrectAnswers': incorrectAnswers,
        'totalQuestions': totalQuestions,
        'percentage': percentage,
        'startedAt': startedAt,
        'completedAt': completedAt,
      });

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        final attempt = QuizAttempt.fromJson(data['attempt']);
        _attempts.insert(0, attempt);
        _topicScores[topicId] = percentage;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = data['error'] ?? 'Failed to save quiz attempt.';
      }
    } catch (e) {
      _errorMessage = 'Failed to save quiz attempt.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }
}
