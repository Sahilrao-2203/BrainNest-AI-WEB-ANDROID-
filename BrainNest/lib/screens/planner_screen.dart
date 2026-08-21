import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/curriculum_provider.dart';
import '../providers/planner_provider.dart';
import 'companion_screen.dart';

class PlannerScreen extends StatelessWidget {
  const PlannerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final curriculum = Provider.of<CurriculumProvider>(context);
    final planner = Provider.of<PlannerProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Study Planner'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Overall percentage card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Row(
                  children: [
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(
                          height: 80,
                          width: 80,
                          child: CircularProgressIndicator(
                            value: planner.percentage / 100.0,
                            strokeWidth: 8,
                            backgroundColor: const Color(0xFFECEEF1),
                            valueColor: const AlwaysStoppedAnimation(Color(0xFF1A237E)),
                          ),
                        ),
                        Text(
                          '${planner.percentage}%',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(width: 24),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Syllabus Completion',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'You have completed ${planner.completedCount} out of ${planner.totalCount} total topics in this semester.',
                            style: const TextStyle(color: Colors.grey, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Focus Areas recommendations section
            const Text(
              'Focus Areas (Recommended)',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (planner.isLoading && planner.focusAreas.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(16.0),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (planner.focusAreas.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(16.0),
                  child: Center(
                    child: Text(
                      'No recommendations found. Try taking a quiz first!',
                      style: TextStyle(color: Color(0xFF454652)),
                    ),
                  ),
                ),
              )
            else
              ...planner.focusAreas.map((area) {
                Color badgeColor = Colors.grey;
                if (area.scoreColor == 'error') badgeColor = Colors.redAccent;
                if (area.scoreColor == 'primary') badgeColor = const Color(0xFF1A237E);

                final isCompleted = planner.completedTopicIds.any((id) =>
                    id == area.topicId ||
                    id == area.topicId.replaceFirst(RegExp(r'^(task-|makaut-)'), '').replaceFirst(RegExp(r'-\d+$'), ''));

                return Card(
                  margin: const EdgeInsets.symmetric(vertical: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Text(
                                area.title,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: badgeColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                area.scoreDisplay,
                                style: TextStyle(
                                  color: badgeColor,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          area.description,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF454652),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFFECEEF1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                area.subjectCode,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  color: Color(0xFF454652),
                                ),
                              ),
                            ),
                            ElevatedButton(
                              onPressed: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => AiCompanionScreen(
                                      topicId: area.topicId,
                                      topicTitle: area.title,
                                      subjectCode: area.subjectCode,
                                    ),
                                  ),
                                );
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF1A237E),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    isCompleted
                                        ? 'Completed'
                                        : (area.scoreDisplay == 'Not Started'
                                            ? 'Get Started'
                                            : 'Continue'),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.arrow_forward, size: 14),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }),
            const SizedBox(height: 24),

            const Text(
              'Subjects Curriculum',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            if (curriculum.subjects.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32.0),
                  child: Text(
                    'No subjects mapped yet. Please upload your syllabus PDF in Dashboard!',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: curriculum.subjects.length,
                itemBuilder: (context, index) {
                  final subject = curriculum.subjects[index];
                  final subTopics = curriculum.topics.where((t) => t.subjectCode == subject.code).toList();
                  final completedSubTopics = subTopics.where((t) {
                    final cleanId = planner.completedTopicIds.any((id) => id == t.id || id == t.id.replaceFirst(RegExp(r'^(task-|makaut-)'), '').replaceFirst(RegExp(r'-\d+$'), ''));
                    return cleanId;
                  }).toList();

                  final double completionVal = subTopics.isEmpty ? 0 : (completedSubTopics.length / subTopics.length);

                  return Card(
                    margin: const EdgeInsets.symmetric(vertical: 8),
                    child: ExpansionTile(
                      leading: const Icon(Icons.menu_book, color: Color(0xFF00BFA5)),
                      title: Text(
                        subject.name,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      subtitle: Text(
                        '${completedSubTopics.length} / ${subTopics.length} completed',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF454652)),
                      ),
                      trailing: SizedBox(
                        width: 50,
                        child: Text(
                          '${(completionVal * 100).round()}%',
                          textAlign: TextAlign.right,
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF00BFA5)),
                        ),
                      ),
                      children: subTopics.map<Widget>((topic) {
                        final isCompleted = planner.completedTopicIds.any((id) => id == topic.id || id == topic.id.replaceFirst(RegExp(r'^(task-|makaut-)'), '').replaceFirst(RegExp(r'-\d+$'), ''));

                        return CheckboxListTile(
                          title: Text(
                            topic.topic,
                            style: TextStyle(
                              fontSize: 14,
                              decoration: isCompleted ? TextDecoration.lineThrough : null,
                            ),
                          ),
                          subtitle: Text(
                            '${topic.module} • ${topic.difficulty}',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF454652)),
                          ),
                          value: isCompleted,
                          onChanged: (val) {
                            planner.toggleTopicProgress(topic.id, auth);
                          },
                          activeColor: const Color(0xFF00BFA5),
                          dense: true,
                        );
                      }).toList(),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
