import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/curriculum_provider.dart';
import '../providers/quiz_provider.dart';
import '../providers/flashcards_provider.dart';

class QuizScreen extends StatefulWidget {
  final bool startInFlashcardMode;
  const QuizScreen({super.key, this.startInFlashcardMode = false});

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  
  // Selection state
  String? _selectedSubjectCode;
  String? _selectedSubjectName;
  String? _selectedTopicId;
  String? _selectedTopicName;
  bool _isFlashcardMode = false;

  // Active quiz state
  List<QuizQuestion>? _activeQuestions;
  int _currentQuestionIndex = 0;
  List<int> _selectedAnswers = [];
  int? _startedAt;

  // Active flashcards state
  List<Flashcard>? _activeFlashcards;
  int _currentFlashcardIndex = 0;
  bool _isFlipped = false;
  List<bool> _memorizedStatus = [];

  // Results state
  bool _showResults = false;
  int _score = 0;
  int _percentage = 0;

  // History tab sub-index (0 for Quizzes, 1 for Flashcards)
  int _historyIndex = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _isFlashcardMode = widget.startInFlashcardMode;
    if (widget.startInFlashcardMode) {
      _historyIndex = 1;
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _startQuiz() async {
    if (_selectedSubjectCode == null || _selectedTopicId == null) return;

    final quizProvider = Provider.of<QuizProvider>(context, listen: false);
    final questions = await quizProvider.generateQuiz(
      subjectName: _selectedSubjectName!,
      subjectCode: _selectedSubjectCode!,
      topicName: _selectedTopicName!,
    );

    if (questions != null && questions.isNotEmpty) {
      setState(() {
        _activeQuestions = questions;
        _currentQuestionIndex = 0;
        _selectedAnswers = List<int>.filled(questions.length, -1);
        _startedAt = DateTime.now().millisecondsSinceEpoch;
        _showResults = false;
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(quizProvider.errorMessage ?? 'Failed to generate quiz. Please try again.'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _submitQuiz() async {
    if (_activeQuestions == null || _startedAt == null) return;

    int correct = 0;
    for (int i = 0; i < _activeQuestions!.length; i++) {
      if (_selectedAnswers[i] == _activeQuestions![i].correctAnswerIndex) {
        correct++;
      }
    }

    final total = _activeQuestions!.length;
    final pct = ((correct / total) * 100).round();
    final completed = DateTime.now().millisecondsSinceEpoch;

    final quizProvider = Provider.of<QuizProvider>(context, listen: false);
    final success = await quizProvider.saveQuizAttempt(
      subjectCode: _selectedSubjectCode!,
      topicId: _selectedTopicId!,
      topic: _selectedTopicName!,
      questions: _activeQuestions!,
      answers: _selectedAnswers,
      score: correct,
      correctAnswers: correct,
      incorrectAnswers: total - correct,
      totalQuestions: total,
      percentage: pct,
      startedAt: _startedAt!,
      completedAt: completed,
    );

    setState(() {
      _score = correct;
      _percentage = pct;
      _showResults = true;
    });

    if (!success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(quizProvider.errorMessage ?? 'Attempt finished but saving failed.'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  void _startFlashcards() async {
    if (_selectedSubjectCode == null || _selectedTopicId == null) return;

    final flashcardsProvider = Provider.of<FlashcardsProvider>(context, listen: false);
    final cards = await flashcardsProvider.generateFlashcards(
      subjectName: _selectedSubjectName!,
      topicName: _selectedTopicName!,
    );

    if (cards != null && cards.isNotEmpty) {
      setState(() {
        _activeFlashcards = cards;
        _currentFlashcardIndex = 0;
        _isFlipped = false;
        _memorizedStatus = List<bool>.filled(cards.length, false);
        _startedAt = DateTime.now().millisecondsSinceEpoch;
        _showResults = false;
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(flashcardsProvider.errorMessage ?? 'Failed to generate flashcards. Please try again.'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _submitFlashcards() async {
    if (_activeFlashcards == null || _startedAt == null) return;

    final total = _activeFlashcards!.length;
    final knewCount = _memorizedStatus.where((k) => k).length;
    final pct = ((knewCount / total) * 100).round();
    final now = DateTime.now().millisecondsSinceEpoch;
    final deckId = 'deck_${_selectedTopicId}_$now';

    final deck = FlashcardDeck(
      id: deckId,
      title: 'Deck: $_selectedTopicName',
      subjectCode: _selectedSubjectCode!,
      subjectName: _selectedSubjectName!,
      topicId: _selectedTopicId!,
      topicName: _selectedTopicName!,
      cards: _activeFlashcards!,
      lastStudiedAt: now,
      createdAt: now,
      updatedAt: now,
    );

    final flashcardsProvider = Provider.of<FlashcardsProvider>(context, listen: false);
    final success = await flashcardsProvider.saveDeck(deck);

    setState(() {
      _score = knewCount;
      _percentage = pct;
      _showResults = true;
    });

    if (!success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(flashcardsProvider.errorMessage ?? 'Deck finished but saving failed.'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  void _markCard(bool knewIt) {
    setState(() {
      _memorizedStatus[_currentFlashcardIndex] = knewIt;
      if (_currentFlashcardIndex < _activeFlashcards!.length - 1) {
        _currentFlashcardIndex++;
        _isFlipped = false;
      } else {
        _submitFlashcards();
      }
    });
  }

  void _resetQuiz() {
    setState(() {
      _activeQuestions = null;
      _activeFlashcards = null;
      _showResults = false;
      _selectedAnswers = [];
      _memorizedStatus = [];
    });
  }

  Widget _buildAmbientBackground(Widget child) {
    return Stack(
      children: [
        Positioned(
          top: -150,
          left: -150,
          child: Container(
            width: 400,
            height: 400,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF00BFA5).withOpacity(0.05),
            ),
          ),
        ),
        Positioned(
          bottom: 100,
          right: -150,
          child: Container(
            width: 500,
            height: 500,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF1A237E).withOpacity(0.04),
            ),
          ),
        ),
        Positioned(
          top: 300,
          left: 200,
          child: Container(
            width: 300,
            height: 300,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFFFFD600).withOpacity(0.02),
            ),
          ),
        ),
        child,
      ],
    );
  }

  Widget _buildSelectionTab() {
    final curriculum = Provider.of<CurriculumProvider>(context);

    if (curriculum.subjects.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: Text(
            'Please upload a syllabus PDF or select a semester to see subjects.',
            textAlign: TextAlign.center,
            style: TextStyle(fontFamily: 'Inter'),
          ),
        ),
      );
    }

    if (_selectedSubjectCode == null) {
      _selectedSubjectCode = curriculum.subjects.first.code;
      _selectedSubjectName = curriculum.subjects.first.name;
    }

    final currentSubjectTopics = curriculum.topics
        .where((t) => t.subjectCode == _selectedSubjectCode)
        .toList();

    if (currentSubjectTopics.isNotEmpty && _selectedTopicId == null) {
      _selectedTopicId = currentSubjectTopics.first.id;
      _selectedTopicName = currentSubjectTopics.first.topic;
    }

    final themeColor = _isFlashcardMode ? const Color(0xFF00BFA5) : const Color(0xFF1A237E);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Mode Selector
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _isFlashcardMode = false;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: !_isFlashcardMode ? const Color(0xFF1A237E) : Colors.transparent,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: !_isFlashcardMode ? const Color(0xFF1A237E) : const Color(0xFFC6C5D4),
                      ),
                    ),
                    child: Center(
                      child: Text(
                        'AI Quiz',
                        style: TextStyle(
                          color: !_isFlashcardMode ? Colors.white : const Color(0xFF454652),
                          fontWeight: FontWeight.bold,
                          fontFamily: 'Montserrat',
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _isFlashcardMode = true;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: _isFlashcardMode ? const Color(0xFF00BFA5) : Colors.transparent,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: _isFlashcardMode ? const Color(0xFF00BFA5) : const Color(0xFFC6C5D4),
                      ),
                    ),
                    child: Center(
                      child: Text(
                        'Flashcards',
                        style: TextStyle(
                          color: _isFlashcardMode ? Colors.white : const Color(0xFF454652),
                          fontWeight: FontWeight.bold,
                          fontFamily: 'Montserrat',
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          
          const Text(
            'Select Subject:',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'Montserrat'),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _selectedSubjectCode,
            isExpanded: true,
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white.withOpacity(0.7),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: const Color(0xFFC6C5D4).withOpacity(0.5)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: themeColor, width: 2),
              ),
            ),
            items: curriculum.subjects.map((sub) {
              return DropdownMenuItem<String>(
                value: sub.code,
                child: Text('${sub.name} (${sub.code})', style: const TextStyle(fontFamily: 'Inter')),
              );
            }).toList(),
            onChanged: (val) {
              final sub = curriculum.subjects.firstWhere((s) => s.code == val);
              setState(() {
                _selectedSubjectCode = val;
                _selectedSubjectName = sub.name;
                _selectedTopicId = null;
                _selectedTopicName = null;
              });
            },
          ),
          const SizedBox(height: 24),
          
          const Text(
            'Select Topic:',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'Montserrat'),
          ),
          const SizedBox(height: 8),
          if (currentSubjectTopics.isEmpty)
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: Text(
                'No topics available for this subject.',
                style: TextStyle(color: Colors.grey, fontFamily: 'Inter'),
              ),
            )
          else
            DropdownButtonFormField<String>(
              value: _selectedTopicId,
              isExpanded: true,
              decoration: InputDecoration(
                filled: true,
                fillColor: Colors.white.withOpacity(0.7),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: const Color(0xFFC6C5D4).withOpacity(0.5)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: themeColor, width: 2),
                ),
              ),
              items: currentSubjectTopics.map((top) {
                return DropdownMenuItem<String>(
                  value: top.id,
                  child: Text(top.topic, style: const TextStyle(fontFamily: 'Inter')),
                );
              }).toList(),
              onChanged: (val) {
                final top = currentSubjectTopics.firstWhere((t) => t.id == val);
                setState(() {
                  _selectedTopicId = val;
                  _selectedTopicName = top.topic;
                });
              },
            ),
          const SizedBox(height: 120),
          ElevatedButton.icon(
            onPressed: currentSubjectTopics.isEmpty
                ? null
                : (_isFlashcardMode ? _startFlashcards : _startQuiz),
            icon: Icon(_isFlashcardMode ? Icons.style : Icons.quiz),
            label: Text(
              _isFlashcardMode ? 'Generate AI Flashcards' : 'Generate AI Quiz',
              style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Montserrat', fontSize: 16),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: themeColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 18),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              elevation: 4,
              shadowColor: themeColor.withOpacity(0.3),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveQuiz() {
    final questions = _activeQuestions!;
    final currentQuestion = questions[_currentQuestionIndex];
    final selectedAnswerIndex = _selectedAnswers[_currentQuestionIndex];

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Question Progress & Timer Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: _resetQuiz,
              ),
              Text(
                'Question ${_currentQuestionIndex + 1} of ${questions.length}',
                style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF454652), fontFamily: 'Inter'),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFC6C5D4).withOpacity(0.5)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x0D1A237E),
                      blurRadius: 10,
                    )
                  ],
                ),
                child: const Row(
                  children: [
                    Icon(Icons.timer_outlined, color: Color(0xFFBA1A1A), size: 16),
                    SizedBox(width: 4),
                    Text(
                      'Exam Mode',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFBA1A1A), fontFamily: 'Inter'),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          LinearProgressIndicator(
            value: (_currentQuestionIndex + 1) / questions.length,
            backgroundColor: const Color(0xFFECEEF1),
            valueColor: const AlwaysStoppedAnimation(Color(0xFF1A237E)),
            minHeight: 6,
            borderRadius: BorderRadius.circular(3),
          ),
          const SizedBox(height: 32),

          // Question Card
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Q${_currentQuestionIndex + 1}. ',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1A237E),
                          fontFamily: 'Montserrat',
                        ),
                      ),
                      Expanded(
                        child: Text(
                          currentQuestion.question,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            height: 1.4,
                            color: Color(0xFF191C1E),
                            fontFamily: 'Montserrat',
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  ...List.generate(currentQuestion.options.length, (idx) {
                    final optionText = currentQuestion.options[idx];
                    final isSelected = selectedAnswerIndex == idx;

                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: OutlinedButton(
                        onPressed: () {
                          setState(() {
                            _selectedAnswers[_currentQuestionIndex] = idx;
                          });
                        },
                        style: OutlinedButton.styleFrom(
                          backgroundColor: isSelected
                              ? const Color(0xFF1A237E).withOpacity(0.05)
                              : Colors.white.withOpacity(0.7),
                          side: BorderSide(
                            color: isSelected ? const Color(0xFF1A237E) : const Color(0xFFC6C5D4).withOpacity(0.5),
                            width: isSelected ? 2 : 1,
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                          alignment: Alignment.centerLeft,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 22,
                              height: 22,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isSelected ? const Color(0xFF1A237E) : const Color(0xFFC6C5D4),
                                  width: 2,
                                ),
                                color: isSelected ? const Color(0xFF1A237E) : Colors.transparent,
                              ),
                              child: isSelected
                                  ? const Center(
                                      child: Icon(
                                        Icons.circle,
                                        size: 8,
                                        color: Colors.white,
                                      ),
                                    )
                                  : null,
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Option ${String.fromCharCode(65 + idx)}',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: isSelected ? const Color(0xFF1A237E) : const Color(0xFF767683),
                                      fontFamily: 'Inter',
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    optionText,
                                    style: TextStyle(
                                      color: const Color(0xFF191C1E),
                                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                      fontFamily: 'Inter',
                                      fontSize: 15,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Action Area
          Container(
            padding: const EdgeInsets.only(top: 16),
            decoration: const BoxDecoration(
              border: Border(
                top: BorderSide(color: Color(0x1A1A237E)),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Question flagged for review.'),
                        duration: Duration(seconds: 1),
                      ),
                    );
                  },
                  icon: const Icon(Icons.flag_outlined, color: Color(0xFF454652)),
                  label: const Text(
                    'Flag for Review',
                    style: TextStyle(color: Color(0xFF454652), fontWeight: FontWeight.bold, fontFamily: 'Inter'),
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: selectedAnswerIndex == -1
                      ? null
                      : () {
                          if (_currentQuestionIndex < questions.length - 1) {
                            setState(() {
                              _currentQuestionIndex++;
                            });
                          } else {
                            _submitQuiz();
                          }
                        },
                  icon: const Icon(Icons.arrow_forward, size: 20),
                  label: Text(
                    _currentQuestionIndex == questions.length - 1 ? 'Submit Quiz' : 'Next Question',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Inter'),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1A237E),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveFlashcards() {
    final cards = _activeFlashcards!;
    final currentCard = cards[_currentFlashcardIndex];
    final progress = (_currentFlashcardIndex + 1) / cards.length;

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Progress Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: _resetQuiz,
              ),
              Text(
                'Card ${_currentFlashcardIndex + 1} of ${cards.length}',
                style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF454652), fontFamily: 'Inter'),
              ),
              const SizedBox(width: 48),
            ],
          ),
          const SizedBox(height: 12),
          LinearProgressIndicator(
            value: progress,
            backgroundColor: const Color(0xFFECEEF1),
            valueColor: const AlwaysStoppedAnimation(Color(0xFF00BFA5)),
            minHeight: 6,
            borderRadius: BorderRadius.circular(3),
          ),
          const SizedBox(height: 32),

          // 3D Flippable Card
          Expanded(
            child: FlippableCard(
              isFlipped: _isFlipped,
              onTap: () {
                setState(() {
                  _isFlipped = !_isFlipped;
                });
              },
              front: _buildCardFront(currentCard),
              back: _buildCardBack(currentCard),
            ),
          ),
          const SizedBox(height: 32),

          // Action Buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    _markCard(false);
                  },
                  icon: const Icon(Icons.replay, color: Color(0xFFBA1A1A)),
                  label: const Text('Study Again', style: TextStyle(color: Color(0xFF191C1E), fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    side: const BorderSide(color: Color(0xFFC6C5D4)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    _markCard(true);
                  },
                  icon: const Icon(Icons.check_circle, color: Color(0xFF68FADD)),
                  label: const Text('I Knew It', style: TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1A237E),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCardFront(Flashcard card) {
    return Card(
      elevation: 4,
      shadowColor: const Color(0x1A1A237E),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Colors.white, Color(0xFFF2F4F7)],
          ),
        ),
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.help_center_outlined, color: Color(0xFF767683), size: 36),
            const SizedBox(height: 16),
            const Text(
              'QUESTION',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
                color: Color(0xFF00BFA5),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              card.question,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                height: 1.4,
                color: Color(0xFF1A237E),
                fontFamily: 'Montserrat',
              ),
            ),
            const Spacer(),
            const Text(
              'Click to flip',
              style: TextStyle(color: Color(0xFF767683), fontSize: 13, fontStyle: FontStyle.italic),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCardBack(Flashcard card) {
    return Card(
      elevation: 4,
      shadowColor: const Color(0x1A1A237E),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          color: Colors.white,
        ),
        padding: const EdgeInsets.all(32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.lightbulb_outlined, color: Color(0xFF00BFA5), size: 28),
                SizedBox(width: 8),
                Text(
                  'ANSWER',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                    color: Color(0xFF00BFA5),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.only(left: 16),
                      decoration: const BoxDecoration(
                        border: Border(
                          left: BorderSide(color: Color(0xFF00BFA5), width: 4),
                        ),
                      ),
                      child: Text(
                        card.answer,
                        style: const TextStyle(
                          fontSize: 15,
                          height: 1.5,
                          color: Color(0xFF191C1E),
                          fontFamily: 'Inter',
                        ),
                      ),
                    ),
                    if (card.explanation.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF5F7FA),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFECEEF1)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.info_outline, color: Color(0xFF1A237E), size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                card.explanation,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF454652),
                                  fontStyle: FontStyle.italic,
                                  fontFamily: 'Inter',
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ]
                  ],
                ),
              ),
            ),
            const Center(
              child: Padding(
                padding: EdgeInsets.only(top: 8.0),
                child: Text(
                  'Click to flip back',
                  style: TextStyle(color: Color(0xFF767683), fontSize: 13, fontStyle: FontStyle.italic),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResults() {
    return _activeFlashcards != null ? _buildFlashcardsResults() : _buildQuizResults();
  }

  Widget _buildQuizResults() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Center(
            child: Icon(
              Icons.emoji_events,
              color: Colors.amber,
              size: 80,
            ),
          ),
          const SizedBox(height: 16),
          const Center(
            child: Text(
              'Quiz Completed!',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, fontFamily: 'Montserrat'),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: Text(
              'You scored $_score / ${_activeQuestions!.length} ($_percentage%)',
              style: const TextStyle(fontSize: 18, color: Colors.grey, fontFamily: 'Inter'),
            ),
          ),
          const SizedBox(height: 32),

          // Answers summary list
          Expanded(
            child: ListView.builder(
              itemCount: _activeQuestions!.length,
              itemBuilder: (context, i) {
                final q = _activeQuestions![i];
                final ans = _selectedAnswers[i];
                final isCorrect = ans == q.correctAnswerIndex;

                return Card(
                  margin: const EdgeInsets.symmetric(vertical: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${i + 1}. ${q.question}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Montserrat'),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Icon(
                              isCorrect ? Icons.check_circle : Icons.cancel,
                              color: isCorrect ? Colors.green : Colors.red,
                              size: 18,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Your answer: ${q.options[ans]}',
                                style: TextStyle(
                                  color: isCorrect ? Colors.green : Colors.red,
                                  fontWeight: FontWeight.bold,
                                  fontFamily: 'Inter',
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (!isCorrect) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Correct answer: ${q.options[q.correctAnswerIndex]}',
                            style: const TextStyle(color: Colors.green, fontFamily: 'Inter'),
                          ),
                        ]
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          ElevatedButton(
            onPressed: _resetQuiz,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1A237E),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            ),
            child: const Text('Back to Quiz Select', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildFlashcardsResults() {
    final knewCount = _memorizedStatus.where((k) => k).length;
    final total = _activeFlashcards!.length;
    final percentage = ((knewCount / total) * 100).round();

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Center(
            child: Icon(
              Icons.star,
              color: Color(0xFFFFD600),
              size: 80,
            ),
          ),
          const SizedBox(height: 16),
          const Center(
            child: Text(
              'Deck Completed!',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, fontFamily: 'Montserrat'),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: Text(
              'You knew $knewCount out of $total cards ($percentage%)',
              style: const TextStyle(fontSize: 18, color: Colors.grey, fontFamily: 'Inter'),
            ),
          ),
          const SizedBox(height: 32),
          Expanded(
            child: ListView.builder(
              itemCount: _activeFlashcards!.length,
              itemBuilder: (context, i) {
                final card = _activeFlashcards![i];
                final knew = _memorizedStatus[i];

                return Card(
                  margin: const EdgeInsets.symmetric(vertical: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${i + 1}. ${card.question}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Montserrat'),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          card.answer,
                          style: const TextStyle(color: Color(0xFF454652), fontFamily: 'Inter'),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Icon(
                              knew ? Icons.check_circle : Icons.cancel,
                              color: knew ? Colors.green : Colors.red,
                              size: 18,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              knew ? 'You knew this!' : 'Need to study again',
                              style: TextStyle(
                                color: knew ? Colors.green : Colors.red,
                                fontWeight: FontWeight.bold,
                                fontFamily: 'Inter',
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          ElevatedButton(
            onPressed: _resetQuiz,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00BFA5),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            ),
            child: const Text('Back to Flashcard Select', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Expanded(
                child: ChoiceChip(
                  label: const Center(child: Text('Quiz History', style: TextStyle(fontFamily: 'Montserrat', fontSize: 13))),
                  selected: _historyIndex == 0,
                  selectedColor: const Color(0xFF1A237E).withOpacity(0.15),
                  onSelected: (val) {
                    if (val) setState(() => _historyIndex = 0);
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ChoiceChip(
                  label: const Center(child: Text('Flashcards', style: TextStyle(fontFamily: 'Montserrat', fontSize: 13))),
                  selected: _historyIndex == 1,
                  selectedColor: const Color(0xFF00BFA5).withOpacity(0.15),
                  onSelected: (val) {
                    if (val) setState(() => _historyIndex = 1);
                  },
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: _historyIndex == 0 ? _buildQuizHistory() : _buildFlashcardHistory(),
        ),
      ],
    );
  }

  Widget _buildQuizHistory() {
    final quizProvider = Provider.of<QuizProvider>(context);

    if (quizProvider.attempts.isEmpty) {
      return const Center(
        child: Text(
          'No quiz attempts logged yet.',
          style: TextStyle(color: Colors.grey, fontFamily: 'Inter'),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: quizProvider.attempts.length,
      itemBuilder: (context, index) {
        final attempt = quizProvider.attempts[index];
        final date = DateTime.fromMillisecondsSinceEpoch(attempt.createdAt);
        final formattedDate = DateFormat('MMM dd, yyyy - hh:mm a').format(date);

        return Card(
          child: ExpansionTile(
            title: Text(
              attempt.topic,
              style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Montserrat'),
            ),
            subtitle: Text(
              '${attempt.subjectCode} • $formattedDate',
              style: const TextStyle(fontSize: 12, color: Colors.grey, fontFamily: 'Inter'),
            ),
            trailing: CircleAvatar(
              backgroundColor: attempt.percentage >= 60
                  ? const Color(0xFF1E3A1E)
                  : const Color(0xFF3B1E1E),
              child: Text(
                '${attempt.percentage}%',
                style: TextStyle(
                  color: attempt.percentage >= 60 ? Colors.green : Colors.red,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Inter',
                ),
              ),
            ),
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Total Questions: ${attempt.totalQuestions}', style: const TextStyle(fontFamily: 'Inter')),
                    Text('Correct Answers: ${attempt.correctAnswers}', style: const TextStyle(fontFamily: 'Inter')),
                    Text('Incorrect Answers: ${attempt.incorrectAnswers}', style: const TextStyle(fontFamily: 'Inter')),
                    const SizedBox(height: 12),
                    const Text(
                      'Detailed Review:',
                      style: TextStyle(fontWeight: FontWeight.bold, decoration: TextDecoration.underline, fontFamily: 'Montserrat'),
                    ),
                    const SizedBox(height: 8),
                    ...List.generate(attempt.questions.length, (qIdx) {
                      final q = attempt.questions[qIdx];
                      final ans = attempt.answers[qIdx];
                      final isCorrect = ans == q.correctAnswerIndex;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Q${qIdx + 1}: ${q.question}',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, fontFamily: 'Montserrat'),
                            ),
                            Text(
                              '• Answered: ${q.options[ans]}',
                              style: TextStyle(
                                fontSize: 12,
                                color: isCorrect ? Colors.green : Colors.red,
                                fontFamily: 'Inter',
                              ),
                            ),
                            if (!isCorrect)
                              Text(
                                '• Correct: ${q.options[q.correctAnswerIndex]}',
                                style: const TextStyle(fontSize: 12, color: Colors.green, fontFamily: 'Inter'),
                              ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              )
            ],
          ),
        );
      },
    );
  }

  Widget _buildFlashcardHistory() {
    final flashcardsProvider = Provider.of<FlashcardsProvider>(context);

    if (flashcardsProvider.decks.isEmpty) {
      return const Center(
        child: Text(
          'No flashcard decks studied yet.',
          style: TextStyle(color: Colors.grey, fontFamily: 'Inter'),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: flashcardsProvider.decks.length,
      itemBuilder: (context, index) {
        final deck = flashcardsProvider.decks[index];
        final date = DateTime.fromMillisecondsSinceEpoch(deck.updatedAt);
        final formattedDate = DateFormat('MMM dd, yyyy - hh:mm a').format(date);

        return Card(
          child: ExpansionTile(
            title: Text(
              deck.topicName,
              style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Montserrat'),
            ),
            subtitle: Text(
              '${deck.subjectCode} • ${deck.cards.length} cards • $formattedDate',
              style: const TextStyle(fontSize: 12, color: Colors.grey, fontFamily: 'Inter'),
            ),
            leading: const Icon(Icons.style, color: Color(0xFF00BFA5)),
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ...List.generate(deck.cards.length, (cIdx) {
                      final c = deck.cards[cIdx];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Card ${cIdx + 1}: ${c.question}',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, fontFamily: 'Montserrat'),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '• Answer: ${c.answer}',
                              style: const TextStyle(fontSize: 12, color: Color(0xFF454652), fontFamily: 'Inter'),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              )
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final quizProvider = Provider.of<QuizProvider>(context);
    final flashcardsProvider = Provider.of<FlashcardsProvider>(context);

    final isLoading = quizProvider.isLoading || flashcardsProvider.isLoading;

    // Loading indicator screen
    if (isLoading && _activeQuestions == null && _activeFlashcards == null && !_showResults) {
      final loadingText = _isFlashcardMode
          ? 'Generating custom AI flashcards...'
          : 'Generating custom AI quiz questions...';
      final themeColor = _isFlashcardMode ? const Color(0xFF00BFA5) : const Color(0xFF1A237E);

      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: themeColor),
              const SizedBox(height: 24),
              Text(
                loadingText,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, fontFamily: 'Montserrat'),
              ),
              const SizedBox(height: 8),
              const Text(
                'Consulting Gemini via backend proxy...',
                style: TextStyle(color: Colors.grey, fontSize: 13, fontFamily: 'Inter'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_isFlashcardMode ? 'AI Flashcards' : 'AI Topic Quizzes'),
        bottom: (_activeQuestions == null && _activeFlashcards == null)
            ? TabBar(
                controller: _tabController,
                tabs: const [
                  Tab(text: 'Generate'),
                  Tab(text: 'History'),
                ],
              )
            : null,
      ),
      body: _buildAmbientBackground(
        _activeQuestions != null
            ? (_showResults ? _buildResults() : _buildActiveQuiz())
            : (_activeFlashcards != null
                ? (_showResults ? _buildResults() : _buildActiveFlashcards())
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildSelectionTab(),
                      _buildHistoryTab(),
                    ],
                  )),
      ),
    );
  }
}

class FlippableCard extends StatelessWidget {
  final bool isFlipped;
  final VoidCallback onTap;
  final Widget front;
  final Widget back;

  const FlippableCard({
    super.key,
    required this.isFlipped,
    required this.onTap,
    required this.front,
    required this.back,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: TweenAnimationBuilder<double>(
        tween: Tween<double>(begin: 0.0, end: isFlipped ? 1.0 : 0.0),
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
        builder: (context, val, child) {
          final transform = Matrix4.identity()
            ..setEntry(3, 2, 0.001)
            ..rotateY(val * 3.14159265);

          return Transform(
            transform: transform,
            alignment: Alignment.center,
            child: val >= 0.5
                ? Transform(
                    transform: Matrix4.identity()..rotateY(3.14159265),
                    alignment: Alignment.center,
                    child: back,
                  )
                : front,
          );
        },
      ),
    );
  }
}
