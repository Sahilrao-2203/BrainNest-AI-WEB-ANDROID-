import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:brainnest/providers/auth_provider.dart';
import 'package:brainnest/providers/curriculum_provider.dart';
import 'package:brainnest/providers/mood_provider.dart';
import 'package:brainnest/providers/planner_provider.dart';
import 'package:brainnest/providers/study_stats_provider.dart';
import 'package:brainnest/screens/syllabus_review_screen.dart';
import 'package:brainnest/screens/quiz_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  void _pickSyllabus(BuildContext context) async {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final curriculumProvider = Provider.of<CurriculumProvider>(context, listen: false);

    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
        withData: true,
      );

      debugPrint('========== SYLLABUS AI DEBUG ==========');
      if (result == null) {
        debugPrint('STEP 1: PDF selected: NO');
        debugPrint('========================================');
        return;
      }

      debugPrint('STEP 1: PDF selected: YES');
      final file = result.files.single;
      debugPrint('STEP 2: PDF filename: ${file.name}');
      debugPrint('STEP 3: PDF size: ${file.size}');

      Uint8List? bytes = file.bytes;
      if (bytes == null && file.path != null) {
        try {
          bytes = await File(file.path!).readAsBytes();
        } catch (e) {
          debugPrint('Error reading PDF file path: $e');
        }
      }

      if (bytes == null) {
        debugPrint('STEP 5: PDF text extracted: NO');
        debugPrint('Error: PDF bytes are null and file path is unreadable.');
        debugPrint('========================================');
        scaffoldMessenger.showSnackBar(
          const SnackBar(content: Text('Failed to read selected PDF file.'), backgroundColor: Colors.red),
        );
        return;
      }

      curriculumProvider.updateLoadingMessage('Reading syllabus...');
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => Center(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Consumer<CurriculumProvider>(
                builder: (_, provider, __) {
                  final msg = provider.loadingMessage ?? 'Reading PDF & Parsing with AI...';
                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(),
                      const SizedBox(height: 16),
                      Text(msg, style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Inter')),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      );

      final text = await curriculumProvider.extractTextFromPdf(bytes);
      final parsedJson = await curriculumProvider.parseSyllabusWithAi(text);
      
      navigator.pop();

      if (parsedJson != null) {
        navigator.push(
          MaterialPageRoute(
            builder: (_) => SyllabusReviewScreen(parsedSyllabus: parsedJson),
          ),
        );
      } else {
        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text(curriculumProvider.errorMessage ?? 'Failed to parse syllabus PDF'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  void _showMoodCheckIn(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => const MoodCheckInDialog(),
    );
  }

  Widget _buildAmbientBackground(Widget child) {
    return Stack(
      children: [
        Positioned(
          top: -100,
          right: -100,
          child: Container(
            width: 300,
            height: 300,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF1A237E).withOpacity(0.04),
            ),
          ),
        ),
        Positioned(
          bottom: 200,
          left: -150,
          child: Container(
            width: 400,
            height: 400,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF00BFA5).withOpacity(0.04),
            ),
          ),
        ),
        child,
      ],
    );
  }

  Widget _buildBentoCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required VoidCallback onTap,
    bool isSelected = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16.0),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.85),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? iconColor.withOpacity(0.5) : Colors.white.withOpacity(0.5),
            width: isSelected ? 2 : 1,
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0A1A237E),
              blurRadius: 16,
              offset: Offset(0, 4),
            )
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 24),
            ),
            const Spacer(),
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13,
                color: Color(0xFF191C1E),
                fontFamily: 'Montserrat',
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 10,
                color: Color(0xFF767683),
                fontFamily: 'Inter',
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final curriculum = Provider.of<CurriculumProvider>(context);
    final mood = Provider.of<MoodProvider>(context);
    final planner = Provider.of<PlannerProvider>(context);
    final studyStats = Provider.of<StudyStatsProvider>(context);

    final userName = auth.userProfile?['name'] ?? 'Student';
    final hasSyllabus = curriculum.customSyllabus != null;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F9FC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF7F9FC),
        title: const Text(
          'BrainNest Dashboard',
          style: TextStyle(fontFamily: 'Montserrat', fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              curriculum.loadCurriculum(auth.userProfile);
              planner.fetchProgress(auth.userProfile);
              mood.fetchTodayMood(auth.userProfile);
              studyStats.fetchStats(auth.userProfile);
            },
          )
        ],
      ),
      body: _buildAmbientBackground(
        SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Greeting & Streak
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hello, $userName!',
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, fontFamily: 'Montserrat'),
                        ),
                        Text(
                          auth.userProfile?['branch'] ?? 'Computer Science & Engineering',
                          style: const TextStyle(fontSize: 13, color: Color(0xFF767683), fontFamily: 'Inter'),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF1A237E), width: 1.5),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.local_fire_department, color: Colors.orange, size: 20),
                        const SizedBox(width: 4),
                        if (studyStats.isLoading)
                          const SizedBox(
                            width: 12,
                            height: 12,
                            child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.orange),
                          )
                        else
                          Text(
                            studyStats.streakDays,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Inter'),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Study Stats summary card
              Container(
                padding: const EdgeInsets.all(20.0),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.8),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.5)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x0A1A237E),
                      blurRadius: 16,
                      offset: Offset(0, 4),
                    )
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    Expanded(
                      child: Column(
                        children: [
                          const Icon(Icons.timer, color: Color(0xFF1A237E), size: 28),
                          const SizedBox(height: 8),
                          const Text('Hours Studied', style: TextStyle(color: Colors.grey, fontSize: 11, fontFamily: 'Inter')),
                          const SizedBox(height: 4),
                          if (studyStats.isLoading)
                            const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 1.5, color: Color(0xFF1A237E)),
                            )
                          else
                            Text(
                              studyStats.hoursStudied,
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'Montserrat'),
                            ),
                        ],
                      ),
                    ),
                    Container(height: 40, width: 1.5, color: const Color(0xFFECEEF1)),
                    Expanded(
                      child: Column(
                        children: [
                          const Icon(Icons.local_fire_department, color: Colors.orange, size: 28),
                          const SizedBox(height: 8),
                          const Text('Current Streak', style: TextStyle(color: Colors.grey, fontSize: 11, fontFamily: 'Inter')),
                          const SizedBox(height: 4),
                          if (studyStats.isLoading)
                            const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.orange),
                            )
                          else
                            Text(
                              studyStats.streakDays,
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'Montserrat'),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Study Progress Bar Card
              Container(
                padding: const EdgeInsets.all(20.0),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.8),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.5)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x0A1A237E),
                      blurRadius: 16,
                      offset: Offset(0, 4),
                    )
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Curriculum Progress',
                          style: TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Montserrat', fontSize: 14),
                        ),
                        Text(
                          '${planner.percentage}%',
                          style: const TextStyle(color: Color(0xFF00BFA5), fontWeight: FontWeight.bold, fontFamily: 'Montserrat'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    LinearProgressIndicator(
                      value: planner.percentage / 100.0,
                      backgroundColor: const Color(0xFFECEEF1),
                      valueColor: const AlwaysStoppedAnimation(Color(0xFF00BFA5)),
                      minHeight: 8,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Completed ${planner.completedCount} of ${planner.totalCount} topics',
                      style: const TextStyle(fontSize: 11, color: Colors.grey, fontFamily: 'Inter'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Bento Style Quick Actions
              const Text(
                'AI Study Companion Tools',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, fontFamily: 'Montserrat'),
              ),
              const SizedBox(height: 12),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 1.35,
                children: [
                  _buildBentoCard(
                    context: context,
                    title: hasSyllabus ? 'Syllabus Synced' : 'Upload Syllabus',
                    subtitle: hasSyllabus ? 'Curriculum active' : 'Import your study schedule',
                    icon: hasSyllabus ? Icons.check_circle : Icons.upload_file,
                    iconColor: const Color(0xFF1A237E),
                    onTap: () => _pickSyllabus(context),
                    isSelected: hasSyllabus,
                  ),
                  _buildBentoCard(
                    context: context,
                    title: mood.todayMood != null ? 'Checked In' : 'Mood Check-in',
                    subtitle: mood.todayMood != null ? 'Focus set for today' : 'Log state to focus',
                    icon: mood.todayMood != null ? Icons.emoji_emotions : Icons.add_reaction_outlined,
                    iconColor: const Color(0xFFFFD600),
                    onTap: () => _showMoodCheckIn(context),
                    isSelected: mood.todayMood != null,
                  ),
                  _buildBentoCard(
                    context: context,
                    title: 'Take AI Quiz',
                    subtitle: 'Test your understanding',
                    icon: Icons.quiz,
                    iconColor: const Color(0xFF1A237E),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const QuizScreen(startInFlashcardMode: false),
                        ),
                      );
                    },
                  ),
                  _buildBentoCard(
                    context: context,
                    title: 'Study Flashcards',
                    subtitle: 'Master active recall',
                    icon: Icons.style,
                    iconColor: const Color(0xFF00BFA5),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const QuizScreen(startInFlashcardMode: true),
                        ),
                      );
                    },
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Daily Planner Tasks Checklist
              const Text(
                'Today\'s Study Tasks',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, fontFamily: 'Montserrat'),
              ),
              const SizedBox(height: 12),
              
              if (planner.isLoading || mood.isLoading)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(24.0),
                    child: Center(
                      child: CircularProgressIndicator(),
                    ),
                  ),
                )
              else if (mood.todayMood == null)
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: const Padding(
                    padding: EdgeInsets.all(24.0),
                    child: Center(
                      child: Text(
                        'Complete your Mood Check-in to generate your customized Daily Study Plan!',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Color(0xFF454652), fontFamily: 'Inter'),
                      ),
                    ),
                  ),
                )
              else if (planner.dailyTasks.isEmpty)
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Center(
                      child: Column(
                        children: [
                          const Text(
                            'No tasks generated yet.',
                            style: TextStyle(color: Color(0xFF454652), fontFamily: 'Inter'),
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: () async {
                              String code = mood.selectedSubjectCode;
                              if (!curriculum.subjects.any((s) => s.code == code)) {
                                if (curriculum.subjects.isNotEmpty) {
                                  code = curriculum.subjects.first.code;
                                }
                              }
                              await planner.generatePlan(
                                mood.todayMood!,
                                code,
                                curriculum,
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF1A237E),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                            ),
                            child: const Text('Generate Study Plan', style: TextStyle(fontFamily: 'Montserrat')),
                          )
                        ],
                      ),
                    ),
                  ),
                )
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: planner.dailyTasks.length,
                  itemBuilder: (context, index) {
                    final task = planner.dailyTasks[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      child: CheckboxListTile(
                        title: Text(
                          task.title,
                          style: TextStyle(
                            decoration: task.completed ? TextDecoration.lineThrough : null,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'Montserrat',
                            color: task.urgent ? const Color(0xFFFFD600) : null,
                          ),
                        ),
                        subtitle: Text(task.subtitle, style: const TextStyle(fontFamily: 'Inter', fontSize: 12)),
                        value: task.completed,
                        onChanged: (val) {
                          planner.toggleTopicProgress(task.id, auth);
                        },
                        activeColor: const Color(0xFF00BFA5),
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class MoodCheckInDialog extends StatefulWidget {
  const MoodCheckInDialog({super.key});

  @override
  State<MoodCheckInDialog> createState() => _MoodCheckInDialogState();
}

class _MoodCheckInDialogState extends State<MoodCheckInDialog> {
  String? _selectedMood;
  String? _selectedSubjectCode;

  final List<Map<String, String>> _moods = [
    {'value': 'great', 'label': 'Great', 'emoji': '😊'},
    {'value': 'good', 'label': 'Good', 'emoji': '🙂'},
    {'value': 'okay', 'label': 'Okay', 'emoji': '😐'},
    {'value': 'low', 'label': 'Low', 'emoji': '😔'},
    {'value': 'sad', 'label': 'Sad', 'emoji': '😢'},
    {'value': 'stressed', 'label': 'Stressed', 'emoji': '😫'},
  ];

  @override
  Widget build(BuildContext context) {
    final curriculum = Provider.of<CurriculumProvider>(context);
    final moodProvider = Provider.of<MoodProvider>(context);
    final planner = Provider.of<PlannerProvider>(context);

    if (curriculum.subjects.isEmpty) {
      return const AlertDialog(
        title: Text('No Curriculum Found', style: TextStyle(fontFamily: 'Montserrat')),
        content: Text('Please upload your syllabus PDF first to begin.', style: TextStyle(fontFamily: 'Inter')),
      );
    }

    _selectedMood ??= moodProvider.todayMood;
    _selectedSubjectCode ??= moodProvider.selectedSubjectCode;

    if (_selectedSubjectCode == null || !curriculum.subjects.any((s) => s.code == _selectedSubjectCode)) {
      _selectedSubjectCode = curriculum.subjects.isNotEmpty ? curriculum.subjects.first.code : null;
    }

    return AlertDialog(
      title: const Text('How is your mood today?', style: TextStyle(fontFamily: 'Montserrat', fontWeight: FontWeight.bold)),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Select your current mood:', style: TextStyle(fontSize: 13, color: Colors.grey, fontFamily: 'Inter')),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _moods.map((m) {
                final isSelected = _selectedMood == m['value'];
                return ChoiceChip(
                  label: Text('${m['emoji']} ${m['label']}', style: const TextStyle(fontFamily: 'Inter')),
                  selected: isSelected,
                  selectedColor: const Color(0xFF1A237E).withOpacity(0.15),
                  onSelected: (selected) {
                    setState(() {
                      _selectedMood = selected ? m['value'] : null;
                    });
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 24),
            const Text('Focus Subject today:', style: TextStyle(fontSize: 13, color: Colors.grey, fontFamily: 'Inter')),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _selectedSubjectCode,
              isExpanded: true,
              decoration: InputDecoration(
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              items: curriculum.subjects.map((sub) {
                return DropdownMenuItem<String>(
                  value: sub.code,
                  child: Text('${sub.name} (${sub.code})', style: const TextStyle(fontFamily: 'Inter')),
                );
              }).toList(),
              onChanged: (val) {
                setState(() {
                  _selectedSubjectCode = val;
                });
              },
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel', style: TextStyle(fontFamily: 'Inter')),
        ),
        ElevatedButton(
          onPressed: _selectedMood == null
              ? null
              : () async {
                  final navigator = Navigator.of(context);
                  await moodProvider.checkInMood(_selectedMood!, _selectedSubjectCode!);
                  await planner.generatePlan(_selectedMood!, _selectedSubjectCode!, curriculum);
                  navigator.pop();
                },
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF1A237E),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: const Text('Check In', style: TextStyle(fontFamily: 'Montserrat', fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
