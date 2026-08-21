import 'dart:convert';
import 'package:flutter/material.dart';
import '../core/network/api_client.dart';
import 'auth_provider.dart';

class Flashcard {
  final String question;
  final String answer;
  final String explanation;

  Flashcard({
    required this.question,
    required this.answer,
    required this.explanation,
  });

  factory Flashcard.fromJson(Map<String, dynamic> json) {
    return Flashcard(
      question: json['question'] ?? '',
      answer: json['answer'] ?? '',
      explanation: json['explanation'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'question': question,
        'answer': answer,
        'explanation': explanation,
      };
}

class FlashcardDeck {
  final String id;
  final String title;
  final String subjectCode;
  final String subjectName;
  final String topicId;
  final String topicName;
  final List<Flashcard> cards;
  final int lastStudiedAt;
  final int createdAt;
  final int updatedAt;

  FlashcardDeck({
    required this.id,
    required this.title,
    required this.subjectCode,
    required this.subjectName,
    required this.topicId,
    required this.topicName,
    required this.cards,
    required this.lastStudiedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory FlashcardDeck.fromJson(Map<String, dynamic> json) {
    final List<dynamic> cardsRaw = json['cards'] ?? [];
    return FlashcardDeck(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      subjectCode: json['subjectCode'] ?? '',
      subjectName: json['subjectName'] ?? '',
      topicId: json['topicId'] ?? '',
      topicName: json['topicName'] ?? '',
      cards: cardsRaw.map((c) => Flashcard.fromJson(c)).toList(),
      lastStudiedAt: json['lastStudiedAt'] ?? DateTime.now().millisecondsSinceEpoch,
      createdAt: json['createdAt'] ?? DateTime.now().millisecondsSinceEpoch,
      updatedAt: json['updatedAt'] ?? DateTime.now().millisecondsSinceEpoch,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'subjectCode': subjectCode,
        'subjectName': subjectName,
        'topicId': topicId,
        'topicName': topicName,
        'cards': cards.map((c) => c.toJson()).toList(),
        'lastStudiedAt': lastStudiedAt,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };
}

class FlashcardsProvider extends ChangeNotifier {
  List<FlashcardDeck> _decks = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<FlashcardDeck> get decks => _decks;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  void initialize(AuthProvider authProvider) {
    fetchDecks(authProvider.userProfile);
  }

  Future<void> fetchDecks(Map<String, dynamic>? profile) async {
    if (profile == null) return;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiClient.get('/flashcards');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final List<dynamic> raw = data['decks'] ?? [];
          _decks = raw.map((d) => FlashcardDeck.fromJson(d)).toList();
        }
      } else {
        _errorMessage = 'Failed to load flashcard decks.';
      }
    } catch (e) {
      _errorMessage = 'Failed to load flashcard decks.';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<List<Flashcard>?> generateFlashcards({
    required String subjectName,
    required String topicName,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiClient.post(
        '/flashcards/generate',
        {
          'subjectName': subjectName,
          'topicName': topicName,
        },
        timeout: const Duration(seconds: 60),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        final List<dynamic> raw = data['cards'] ?? [];
        _isLoading = false;
        notifyListeners();
        return raw.map((c) => Flashcard.fromJson(c)).toList();
      } else {
        _errorMessage = data['error'] ?? 'AI Flashcard generation failed.';
      }
    } catch (e) {
      _errorMessage = 'Failed to generate flashcards with AI.';
    }

    _isLoading = false;
    notifyListeners();
    return null;
  }

  Future<bool> saveDeck(FlashcardDeck deck) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiClient.post('/flashcards', deck.toJson());
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        final savedDeck = FlashcardDeck.fromJson(data['deck']);
        final index = _decks.indexWhere((d) => d.id == savedDeck.id);
        if (index != -1) {
          _decks[index] = savedDeck;
        } else {
          _decks.insert(0, savedDeck);
        }
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = data['error'] ?? 'Failed to save flashcard deck.';
      }
    } catch (e) {
      _errorMessage = 'Failed to save flashcard deck.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }
}
