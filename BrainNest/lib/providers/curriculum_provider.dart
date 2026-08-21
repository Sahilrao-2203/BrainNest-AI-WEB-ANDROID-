import 'dart:convert';
import 'dart:typed_data';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:syncfusion_flutter_pdf/pdf.dart';
import 'package:brainnest/core/network/api_client.dart';
import 'package:brainnest/models/curriculum_model.dart';
import 'package:brainnest/models/curriculum_data.dart';
import 'package:brainnest/providers/auth_provider.dart';

class CurriculumProvider extends ChangeNotifier {
  List<MakautSubject> _subjects = [];
  List<CurriculumTopic> _topics = [];
  bool _isLoading = false;
  String? _errorMessage;
  Map<String, dynamic>? _customSyllabus;
  String? _loadingMessage;

  List<MakautSubject> get subjects => _subjects;
  List<CurriculumTopic> get topics => _topics;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  Map<String, dynamic>? get customSyllabus => _customSyllabus;
  String? get loadingMessage => _loadingMessage;

  void updateLoadingMessage(String message) {
    _loadingMessage = message;
    notifyListeners();
  }

  void initialize(AuthProvider authProvider) {
    loadCurriculum(authProvider.userProfile);
  }

  Future<void> loadCurriculum(Map<String, dynamic>? profile) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    // 1. Try loading custom syllabus from server if authenticated
    if (profile != null) {
      try {
        final response = await ApiClient.get('/curriculum/custom');
        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          if (data['success'] == true && data['syllabus'] != null) {
            _customSyllabus = data['syllabus'];
            if (_checkProfileMatch(_customSyllabus, profile)) {
              _applyCustomSyllabus(_customSyllabus!);
              _isLoading = false;
              notifyListeners();
              return;
            }
          }
        }
      } catch (_) {}
    }

    // 2. Try fetching standard subjects and topics from server
    if (profile != null) {
      try {
        final subjectsResponse = await ApiClient.get('/subjects');
        final topicsResponse = await ApiClient.get('/topics');
        if (subjectsResponse.statusCode == 200 && topicsResponse.statusCode == 200) {
          final subjectsData = jsonDecode(subjectsResponse.body);
          final topicsData = jsonDecode(topicsResponse.body);
          if (subjectsData['success'] == true && topicsData['success'] == true) {
            final semNum = _extractSemesterNum(profile['semester']);
            final List<dynamic> rawSubjects = subjectsData['subjects'] ?? [];
            final List<dynamic> rawTopics = topicsData['topics'] ?? [];

            _subjects = rawSubjects.map((s) => MakautSubject.fromJson(s)).where((s) => s.semester == semNum).toList();
            _topics = rawTopics.map((t) => CurriculumTopic.fromJson(t)).where((t) => t.semester == semNum).toList();
            _customSyllabus = null;
            _isLoading = false;
            notifyListeners();
            return;
          }
        }
      } catch (_) {}
    }

    // 3. Fallback to standard seeded subjects & topics matching user profile
    _applyStandardCurriculum(profile);
    _isLoading = false;
    notifyListeners();
  }

  void _applyStandardCurriculum(Map<String, dynamic>? profile) {
    final semNum = _extractSemesterNum(profile?['semester']);
    _subjects = staticSubjects.where((s) => s.semester == semNum).toList();
    _topics = staticTopics.where((t) => t.semester == semNum).toList();
    _customSyllabus = null;
  }

  int _extractSemesterNum(dynamic sem) {
    if (sem == null) return 1;
    final s = sem.toString().toUpperCase().trim();
    
    // Check for roman numerals or word representations
    if (s.contains('VIII') || s.endsWith(' 8') || s == '8') return 8;
    if (s.contains('VII') || s.endsWith(' 7') || s == '7') return 7;
    if (s.contains('VI') || s.endsWith(' 6') || s == '6') return 6;
    if (s.contains('IV') || s.endsWith(' 4') || s == '4') return 4; // Check IV before V
    if (s.contains('V') || s.endsWith(' 5') || s == '5') return 5;
    if (s.contains('III') || s.endsWith(' 3') || s == '3') return 3;
    if (s.contains('II') || s.endsWith(' 2') || s == '2') return 2;
    if (s.contains('I') || s.endsWith(' 1') || s == '1') return 1;

    final match = RegExp(r'\d+').firstMatch(s);
    if (match != null) {
      return int.parse(match.group(0)!);
    }
    return 1;
  }

  bool _checkProfileMatch(Map<String, dynamic>? syllabus, Map<String, dynamic>? profile) {
    if (syllabus == null || profile == null) return false;

    String norm(dynamic s) => (s ?? '').toString().toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '').replaceAll('and', '');

    final syllabusCourse = norm(syllabus['course']);
    final profileCourse = norm(profile['course']);

    final syllabusBranch = norm(syllabus['branch']);
    final profileBranch = norm(profile['branch']);

    final syllabusYear = _extractSemesterNum(syllabus['year']);
    final profileYear = _extractSemesterNum(profile['year']);

    final syllabusSem = _extractSemesterNum(syllabus['semester']);
    final profileSem = _extractSemesterNum(profile['semester']);

    return syllabusCourse == profileCourse &&
        syllabusBranch == profileBranch &&
        syllabusYear == profileYear &&
        syllabusSem == profileSem;
  }

  void _applyCustomSyllabus(Map<String, dynamic> syllabus) {
    final List<MakautSubject> subjectsList = [];
    final List<CurriculumTopic> topicsList = [];
    final semNum = _extractSemesterNum(syllabus['semester']);

    final subjectsJson = syllabus['subjects'] as List<dynamic>? ?? [];
    for (int subIdx = 0; subIdx < subjectsJson.length; subIdx++) {
      final s = subjectsJson[subIdx];
      final name = (s['name'] ?? s['subjectName'] ?? s['title'] ?? s['subject'] ?? 'Subject').toString().trim();
      final code = (s['code'] ?? s['subjectCode'] ?? 'SUBJ-$subIdx').toString().trim();

      subjectsList.add(MakautSubject(
        code: code,
        name: name,
        semester: semNum,
        icon: _getSubjectIcon(name),
        color: _getSubjectColor(subIdx),
      ));

      final unitsJson = s['units'] as List<dynamic>? ?? [];
      for (int unitIdx = 0; unitIdx < unitsJson.length; unitIdx++) {
        final u = unitsJson[unitIdx];
        final topicsJson = u['topics'] as List<dynamic>? ?? [];

        for (int topicIdx = 0; topicIdx < topicsJson.length; topicIdx++) {
          final t = topicsJson[topicIdx];
          final String topicName = t is String ? t : (t['name'] ?? '');
          final List<dynamic> subtopics = t is Map ? (t['subtopics'] ?? []) : [];

          topicsList.add(CurriculumTopic(
            id: 'custom-$code-$unitIdx-$topicIdx',
            subject: name,
            subjectCode: code,
            semester: semNum,
            module: u['name'] ?? 'Unit $unitIdx',
            topic: topicName,
            subtopic: subtopics.join(', '),
            difficulty: topicIdx % 3 == 0 ? 'easy' : (topicIdx % 3 == 1 ? 'medium' : 'hard'),
            moodSuitability: ['low', 'sad', 'okay', 'good', 'great', 'stressed'],
            learningType: topicIdx % 2 == 0 ? 'learning' : 'practice',
            priority: topicIdx % 2 == 0 ? 'high' : 'medium',
            subjectColor: _getSubjectColor(subIdx),
            estimatedDuration: '30 mins',
          ));
        }
      }
    }

    _subjects = subjectsList;
    _topics = topicsList;
  }

  String _getSubjectIcon(String name) {
    final n = name.toLowerCase();
    if (n.contains('math') || n.contains('calc')) return 'calculate';
    if (n.contains('physics') || n.contains('chem')) return 'science';
    if (n.contains('prog') || n.contains('coding') || n.contains('comput')) return 'terminal';
    if (n.contains('elect')) return 'electric_bolt';
    return 'book';
  }

  String _getSubjectColor(int idx) {
    final colors = ['primary', 'tertiary', 'outline', 'error'];
    return colors[idx % colors.length];
  }

  // Client-Side local PDF Text Extraction via syncfusion_flutter_pdf
  Future<String> extractTextFromPdf(Uint8List fileBytes) async {
    final PdfDocument document = PdfDocument(inputBytes: fileBytes);
    final int pageCount = document.pages.count;
    debugPrint('STEP 4: PDF pages: $pageCount');

    final PdfTextExtractor extractor = PdfTextExtractor(document);
    final String text = extractor.extractText();
    document.dispose();

    final bool hasText = text.trim().isNotEmpty;
    debugPrint('STEP 5: PDF text extracted: ${hasText ? 'YES' : 'NO'}');
    debugPrint('STEP 6: Extracted text length: ${text.length}');

    return text;
  }

  // Helper to determine if an error is transient and should be retried
  bool _isTransientError(dynamic error, int? statusCode) {
    if (statusCode == 502 || statusCode == 503 || statusCode == 504) {
      return true;
    }
    if (error is TimeoutException) {
      return true;
    }
    final errStr = error.toString().toLowerCase();
    if (errStr.contains('socketexception') || 
        errStr.contains('connection reset') || 
        errStr.contains('handshake failed') ||
        errStr.contains('connection refused') ||
        errStr.contains('network is unreachable')) {
      return true;
    }
    return false;
  }

  // AI syllabus parser (calling Express route that triggers Gemini)
  Future<Map<String, dynamic>?> parseSyllabusWithAi(String extractedText) async {
    _isLoading = true;
    _errorMessage = null;
    updateLoadingMessage('Reading syllabus...');
    notifyListeners();

    final startTime = DateTime.now();
    debugPrint('Syllabus AI started: $startTime');

    // Phase 10: PDF Content Validation
    final charCount = extractedText.trim().length;
    if (charCount < 100) {
      _errorMessage = 'Syllabus PDF appears to be empty or unreadable.';
      _isLoading = false;
      notifyListeners();
      debugPrint('Syllabus AI completed: NO (PDF too small: $charCount chars)');
      return null;
    }

    debugPrint('PDF Char Count: $charCount');

    try {
      final result = await _parseWithRetry(extractedText, retryCount: 0);
      final totalDuration = DateTime.now().difference(startTime).inMilliseconds / 1000.0;
      debugPrint('Total AI request duration: $totalDuration seconds');

      if (result != null) {
        debugPrint('Syllabus AI completed: YES');
        _isLoading = false;
        notifyListeners();
        return result;
      }
    } catch (e) {
      debugPrint('Error in parseSyllabusWithAi: $e');
    }

    _errorMessage ??= 'Failed to analyze syllabus with AI.';
    _isLoading = false;
    notifyListeners();
    debugPrint('Syllabus AI completed: NO');
    return null;
  }

  // Recursive helper that performs the post request and handles retries
  Future<Map<String, dynamic>?> _parseWithRetry(String extractedText, {required int retryCount}) async {
    final prompt = """Here is the syllabus text extracted from a PDF course document:
---
$extractedText
---
Analyze the syllabus, identify the course, branch, year, semester, and extract all subjects with their code, credits, marks, and units (with unit name and topics list. Topics must contain nested subtopics if available).

CRITICAL INSTRUCTIONS FOR EXTRACTION:
1. Extract ALL subjects, ALL units, and ALL topics. Do NOT summarize or skip any units or topics.
2. If there are multiple units (e.g., Unit 1, Unit 2, Unit 3, Unit 4), you MUST extract and include every single one of them. Do not combine them or only extract the first one.
3. Keep the original naming, codes, and order of subjects, units, and topics exactly as they appear in the text.
4. Respond ONLY with a valid JSON object matching the requested schema. Do NOT wrap the JSON in markdown code blocks. Do NOT add any extra text or commentary. Verify that the output is strictly valid JSON.""";

    const systemInstruction = """You are an expert academic curriculum parser. Your task is to analyze the syllabus text and return a valid JSON object.
JSON Schema:
{
  "course": "String (e.g. B.Tech, M.Tech)",
  "branch": "String (e.g. Computer Science & Engineering)",
  "year": "String (e.g. 1st Year, 2nd Year)",
  "semester": "String (e.g. Semester 2, 1st Semester)",
  "subjects": [
    {
      "name": "String",
      "code": "String",
      "type": "String (Theory or Practical)",
      "credits": Number or null,
      "marks": Number or null,
      "units": [
        {
          "name": "String (Unit name, e.g. Unit 1: Introduction)",
          "topics": [
            {
              "name": "String (Topic title)",
              "subtopics": ["String (Subtopic title)"]
            }
          ]
        }
      ]
    }
  ]
}

CRITICAL RULES:
- You must extract and preserve ALL units and ALL topics. Never omit, truncate, summarize, or group units/topics unless they are identical.
- Respond with raw JSON only. Do not include markdown code block formatting (e.g., do not wrap in ```json).""";

    updateLoadingMessage('Analyzing syllabus with AI...');
    final requestStartTime = DateTime.now();

    http.Response? response;
    dynamic requestError;

    try {
      response = await ApiClient.post(
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
        timeout: ApiClient.syllabusAnalysisTimeout,
      );
    } catch (e) {
      requestError = e;
    }

    final requestDuration = DateTime.now().difference(requestStartTime).inMilliseconds / 1000.0;
    debugPrint('Gemini request duration: $requestDuration seconds');

    final int? statusCode = response?.statusCode;

    // Check if we should retry
    if (response == null || statusCode != 200) {
      final isTransient = _isTransientError(requestError ?? response, statusCode);
      if (isTransient && retryCount < 1) {
        debugPrint('Transient error detected (Status: $statusCode, Error: $requestError). Retrying in 2 seconds (Attempt ${retryCount + 1})...');
        updateLoadingMessage('Connection issue. Retrying analysis...');
        await Future.delayed(const Duration(seconds: 2));
        return _parseWithRetry(extractedText, retryCount: retryCount + 1);
      }
      
      // If we failed and cannot retry, set error message
      if (statusCode != null) {
        try {
          final errBody = jsonDecode(response!.body);
          _errorMessage = errBody['error'] ?? 'AI Parsing failed.';
        } catch (_) {
          _errorMessage = 'AI Parsing failed with status code $statusCode.';
        }
      } else {
        _errorMessage = 'Connection timeout or network failure during AI analysis.';
      }
      return null;
    }

    // Process successful response
    updateLoadingMessage('Organizing subjects and topics...');
    try {
      final data = jsonDecode(response.body);
      if (data['success'] == true && data['text'] != null) {
        String cleanText = data['text'].toString().trim();
        
        // Strip markdown blocks if any
        final startIdx = cleanText.indexOf('{');
        final endIdx = cleanText.lastIndexOf('}');
        if (startIdx != -1 && endIdx != -1 && endIdx > startIdx) {
          cleanText = cleanText.substring(startIdx, endIdx + 1);
        }

        final parsedSyllabus = jsonDecode(cleanText) as Map<String, dynamic>;

        // Phase 11 & 12: Completeness Validation
        final subjectsList = parsedSyllabus['subjects'] as List<dynamic>? ?? [];
        final subjectsCount = subjectsList.length;
        
        int unitsCount = 0;
        int topicsCount = 0;

        for (final s in subjectsList) {
          final unitsList = s['units'] as List<dynamic>? ?? [];
          unitsCount += unitsList.length;
          for (final u in unitsList) {
            final topicsList = u['topics'] as List<dynamic>? ?? [];
            topicsCount += topicsList.length;
          }
        }

        final bool isValid = subjectsCount > 0 && unitsCount > 0 && topicsCount > 0;
        
        if (isValid) {
          updateLoadingMessage('Preparing your syllabus...');
          debugPrint('Syllabus validated successfully (Subjects: $subjectsCount, Units: $unitsCount, Topics: $topicsCount)');
          return parsedSyllabus;
        } else {
          debugPrint('Validation failed: subjects=$subjectsCount, units=$unitsCount, topics=$topicsCount');
          _errorMessage = 'Some syllabus content could not be analyzed completely. Please try again.';
          return null;
        }
      }
    } catch (e) {
      debugPrint('JSON parse error: $e');
    }

    _errorMessage = 'Some syllabus content could not be analyzed completely. Please try again.';
    return null;
  }

  // Save finalized reviewed syllabus
  Future<bool> saveCustomSyllabus(Map<String, dynamic> syllabus, AuthProvider authProvider) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiClient.post('/curriculum/custom', syllabus);
      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        _customSyllabus = syllabus;
        _applyCustomSyllabus(syllabus);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = data['error'] ?? 'Failed to save syllabus.';
      }
    } catch (e) {
      _errorMessage = 'Failed to save syllabus to server.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> deleteCustomSyllabus(AuthProvider authProvider) async {
    _isLoading = true;
    notifyListeners();

    try {
      await ApiClient.delete('/curriculum/custom');
    } catch (_) {}

    _customSyllabus = null;
    _applyStandardCurriculum(authProvider.userProfile);
    _isLoading = false;
    notifyListeners();
  }
}

