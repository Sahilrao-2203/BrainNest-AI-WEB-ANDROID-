import 'dart:convert';
import 'package:flutter/material.dart';
import '../core/network/api_client.dart';

class Note {
  final String id;
  final String title;
  final String content;
  final List<String> tags;
  final String? subjectCode;
  final String createdAt;
  final String updatedAt;

  Note({
    required this.id,
    required this.title,
    required this.content,
    required this.tags,
    this.subjectCode,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Note.fromJson(Map<String, dynamic> json) {
    return Note(
      id: json['id'] ?? '',
      title: json['title'] ?? 'Untitled Note',
      content: json['content'] ?? '',
      tags: List<String>.from(json['tags'] ?? []),
      subjectCode: json['subjectCode'],
      createdAt: json['createdAt'] ?? '',
      updatedAt: json['updatedAt'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'content': content,
    'tags': tags,
    'subjectCode': subjectCode,
    'createdAt': createdAt,
    'updatedAt': updatedAt,
  };
}

class NotesProvider extends ChangeNotifier {
  List<Note> _notes = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<Note> get notes => _notes;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchNotes() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiClient.get('/notes');
      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final List<dynamic> rawNotes = data['notes'] ?? [];
        _notes = rawNotes.map((n) => Note.fromJson(n)).toList();
      } else {
        _errorMessage = data['error'] ?? 'Failed to load notes.';
      }
    } catch (e) {
      _errorMessage = 'Failed to load notes from server.';
    }

    _isLoading = false;
    notifyListeners();
  }

  List<Note> searchNotes(String query) {
    if (query.isEmpty) return _notes;
    final q = query.toLowerCase();
    return _notes.where((note) {
      final titleMatch = note.title.toLowerCase().contains(q);
      final contentMatch = note.content.toLowerCase().contains(q);
      final tagMatch = note.tags.any((tag) => tag.toLowerCase().contains(q));
      return titleMatch || contentMatch || tagMatch;
    }).toList();
  }

  Future<bool> createNote(String title, String content, String? subjectCode, List<String> tags) async {
    _isLoading = true;
    notifyListeners();

    final id = 'note-$DateTime.now().millisecondsSinceEpoch';
    final now = DateTime.now().toIso8601String();
    
    final newNote = Note(
      id: id,
      title: title,
      content: content,
      tags: tags,
      subjectCode: subjectCode,
      createdAt: now,
      updatedAt: now,
    );

    try {
      final response = await ApiClient.post('/notes', newNote.toJson());
      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        _notes.insert(0, newNote);
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (_) {}

    // Fallback save in memory
    _notes.insert(0, newNote);
    _isLoading = false;
    notifyListeners();
    return true;
  }

  Future<bool> updateNote(String id, String title, String content, String? subjectCode, List<String> tags) async {
    _isLoading = true;
    notifyListeners();

    final now = DateTime.now().toIso8601String();

    try {
      final response = await ApiClient.put('/notes/$id', {
        'title': title,
        'content': content,
        'subjectCode': subjectCode,
        'tags': tags,
      });

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final idx = _notes.indexWhere((n) => n.id == id);
        if (idx != -1) {
          _notes[idx] = Note(
            id: id,
            title: title,
            content: content,
            tags: tags,
            subjectCode: subjectCode,
            createdAt: _notes[idx].createdAt,
            updatedAt: now,
          );
        }
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (_) {}

    // Local fallback update
    final idx = _notes.indexWhere((n) => n.id == id);
    if (idx != -1) {
      _notes[idx] = Note(
        id: id,
        title: title,
        content: content,
        tags: tags,
        subjectCode: subjectCode,
        createdAt: _notes[idx].createdAt,
        updatedAt: now,
      );
    }
    _isLoading = false;
    notifyListeners();
    return true;
  }

  Future<bool> deleteNote(String id) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiClient.delete('/notes/$id');
      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        _notes.removeWhere((n) => n.id == id);
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (_) {}

    // Local fallback delete
    _notes.removeWhere((n) => n.id == id);
    _isLoading = false;
    notifyListeners();
    return true;
  }

  Future<Note?> generateStudyNote({
    required String topic,
    String? subjectCode,
    String? subjectName,
    String? focusAreas,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final systemInstruction = '''You are the StudyFlow AI Notes Generator, an expert academic note creator specialized in the MAKAUT B.Tech Computer Science & Engineering curriculum.
Create a structured, high-yield study note in Markdown format.

CRITICAL RULES:
- Do NOT generate a section called 'Conceptual Diagrams', 'Diagram or Code Example', or any diagrammatic section.
- Do NOT create ASCII diagrams, Mermaid diagrams, flowcharts, graph TD blocks, flowchart TD blocks, visual diagrams, diagram code, box diagrams, or text-art illustrations.
- Explain concepts using normal text, structured headings, bullet points, tables, and mathematical formulas instead.
- For mathematical, physics, and scientific topics, present equations, derivations, formulas, explanations, and descriptive text directly instead of generating code/visuals.

Required Format:
# [Topic Title]

## 📌 Core Concept & Overview
(A concise, crystal-clear 2-3 sentence definition and summary. Explain concepts using normal text.)

## 🔑 Key Principles & Formulas
(Bullet points with bold terms, LaTeX math formulas e.g. \$E=mc^2\$ where applicable. This change must NOT affect LaTeX/KaTeX fractions, vectors, subscripts, superscript, etc.)

## 📝 Important Examples
(Concrete academic example calculations, problems, or conceptual study use cases described in normal text and mathematical notation.)

## ⚠️ Common Pitfalls & Exam Tips
(MAKAUT exam focus points, common student mistakes to avoid)

## 🧠 Summary
(One takeaway sentence to memorize)''';

      final userPrompt = '''Generate a high-yield academic study note for:
Topic: "$topic"
${subjectName != null && subjectName.isNotEmpty ? 'Subject: "$subjectName"' : ''}
${focusAreas != null && focusAreas.isNotEmpty ? 'Specific Focus: "$focusAreas"' : ''}

Provide clear headings, bullet points, clean formatting, and practical insights.''';

      final response = await ApiClient.post(
        '/ai/chat',
        {
          'contents': [
            {
              'role': 'user',
              'parts': [{'text': userPrompt}]
            }
          ],
          'systemInstruction': systemInstruction,
        },
        timeout: const Duration(seconds: 90),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true && data['text'] != null) {
        String rawText = data['text'];

        // Post-processing filter to defensively remove any accidental diagram blocks
        rawText = rawText.replaceAll(RegExp(r'##\s*💻?\s*Conceptual Diagrams[\s\S]*?(?=##|$)'), '');
        rawText = rawText.replaceAll(RegExp(r'##\s*💻?\s*Diagram or Code Example[\s\S]*?(?=##|$)'), '');
        rawText = rawText.replaceAll(RegExp(r'```mermaid[\s\S]*?```'), '');
        rawText = rawText.replaceAll(RegExp(r'```graph[\s\S]*?```'), '');
        rawText = rawText.replaceAll(RegExp(r'graph (TD|LR|UT|BT)[\s\S]*?(?=\n\n|\n##|$)'), '');
        rawText = rawText.replaceAll(RegExp(r'flowchart (TD|LR|UT|BT)[\s\S]*?(?=\n\n|\n##|$)'), '');
        rawText = rawText.trim();
        
        final lines = rawText.split('\n');
        String title = topic;
        if (lines.isNotEmpty) {
          final firstLine = lines.first.replaceAll(RegExp(r'^#+\s*'), '').trim();
          if (firstLine.isNotEmpty) {
            title = firstLine;
          }
        }

        final List<String> tags = [
          if (subjectName != null && subjectName.isNotEmpty) subjectName,
          'AI Generated'
        ];

        final id = 'note-\${DateTime.now().millisecondsSinceEpoch}';
        final now = DateTime.now().toIso8601String();
        
        final newNote = Note(
          id: id,
          title: title,
          content: rawText,
          tags: tags,
          subjectCode: subjectCode,
          createdAt: now,
          updatedAt: now,
        );

        try {
          final saveResponse = await ApiClient.post('/notes', newNote.toJson());
          final saveData = jsonDecode(saveResponse.body);
          if (saveResponse.statusCode == 200 && saveData['success'] == true) {
            final savedNote = Note.fromJson(saveData['note'] ?? newNote.toJson());
            _notes.insert(0, savedNote);
            _isLoading = false;
            notifyListeners();
            return savedNote;
          }
        } catch (_) {}

        _notes.insert(0, newNote);
        _isLoading = false;
        notifyListeners();
        return newNote;
      } else {
        _errorMessage = data['error'] ?? 'AI generation failed. Please try again.';
      }
    } catch (e) {
      _errorMessage = 'Connection error. Please verify the AI service is running.';
    }

    _isLoading = false;
    notifyListeners();
    return null;
  }
}

