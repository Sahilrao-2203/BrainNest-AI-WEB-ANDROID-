import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/curriculum_provider.dart';
import '../providers/planner_provider.dart';

class SyllabusReviewScreen extends StatefulWidget {
  final Map<String, dynamic> parsedSyllabus;

  const SyllabusReviewScreen({super.key, required this.parsedSyllabus});

  @override
  State<SyllabusReviewScreen> createState() => _SyllabusReviewScreenState();
}

class _SyllabusReviewScreenState extends State<SyllabusReviewScreen> {
  late TextEditingController _courseController;
  late TextEditingController _branchController;
  late TextEditingController _yearController;
  late TextEditingController _semesterController;
  late Map<String, dynamic> _syllabus;

  @override
  void initState() {
    super.initState();
    _syllabus = Map<String, dynamic>.from(widget.parsedSyllabus);
    _courseController = TextEditingController(text: _syllabus['course']);
    _branchController = TextEditingController(text: _syllabus['branch']);
    _yearController = TextEditingController(text: _syllabus['year']);
    _semesterController = TextEditingController(text: _syllabus['semester']);
  }

  @override
  void dispose() {
    _courseController.dispose();
    _branchController.dispose();
    _yearController.dispose();
    _semesterController.dispose();
    super.dispose();
  }

  void _save() async {
    final curriculum = Provider.of<CurriculumProvider>(context, listen: false);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final planner = Provider.of<PlannerProvider>(context, listen: false);
    final navigator = Navigator.of(context);
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    // Save controller inputs
    _syllabus['course'] = _courseController.text.trim();
    _syllabus['branch'] = _branchController.text.trim();
    _syllabus['year'] = _yearController.text.trim();
    _syllabus['semester'] = _semesterController.text.trim();

    final success = await curriculum.saveCustomSyllabus(_syllabus, auth);

    if (success) {
      // Refresh progress & reload local lists
      await planner.fetchProgress(auth.userProfile);
      scaffoldMessenger.showSnackBar(
        const SnackBar(content: Text('Syllabus confirmed successfully! Daily plan active.'), backgroundColor: Colors.green),
      );
      navigator.pop();
    } else {
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text(curriculum.errorMessage ?? 'Failed to save syllabus'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final subjects = _syllabus['subjects'] as List<dynamic>? ?? [];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Review Extracted Syllabus'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check),
            onPressed: _save,
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Basic metadata fields
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    TextField(
                      controller: _courseController,
                      decoration: const InputDecoration(labelText: 'Course / Degree'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _branchController,
                      decoration: const InputDecoration(labelText: 'Branch / Stream'),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _yearController,
                            decoration: const InputDecoration(labelText: 'Academic Year'),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: TextField(
                            controller: _semesterController,
                            decoration: const InputDecoration(labelText: 'Semester'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            const Text(
              'Extracted Subjects & Modules',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),

            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: subjects.length,
              itemBuilder: (context, subIdx) {
                final sub = subjects[subIdx];
                final units = sub['units'] as List<dynamic>? ?? [];

                String name = (sub['name'] ?? sub['subjectName'] ?? sub['title'] ?? sub['subject'] ?? '').toString().trim();
                final String code = (sub['code'] ?? sub['subjectCode'] ?? '').toString().trim();
                final credits = sub['credits'] ?? sub['credit'] ?? 0;

                if (name.isEmpty) {
                  if (code.isNotEmpty) {
                    name = "Subject $code";
                  } else {
                    name = "Extraction Warning: Missing Subject Name";
                  }
                }

                return Card(
                  margin: const EdgeInsets.symmetric(vertical: 8),
                  child: ExpansionTile(
                    title: Text(
                      code.isNotEmpty ? "$name ($code)" : name,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: name.startsWith("Extraction Warning:") ? Colors.redAccent : null,
                      ),
                    ),
                    subtitle: Text('• $credits Credits'),
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: units.map<Widget>((unit) {
                            final topics = unit['topics'] as List<dynamic>? ?? [];
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 8),
                                Text(
                                  unit['name'] ?? 'Unit',
                                  style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF00BFA5)),
                                ),
                                const Divider(color: Colors.grey),
                                Column(
                                  children: topics.map<Widget>((top) {
                                    final String topicName = top is String ? top : (top['name'] ?? '');
                                    return ListTile(
                                      title: Text(topicName, style: const TextStyle(fontSize: 14)),
                                      dense: true,
                                      leading: const Icon(Icons.circle_outlined, size: 8),
                                    );
                                  }).toList(),
                                )
                              ],
                            );
                          }).toList(),
                        ),
                      )
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 32),

            ElevatedButton(
              onPressed: _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1A237E),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              ),
              child: const Center(
                child: Text('Confirm & Generate Daily Plan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
