import 'package:flutter_test/flutter_test.dart';
import 'package:brainnest/providers/planner_provider.dart';
import 'package:brainnest/providers/curriculum_provider.dart';
import 'package:brainnest/models/curriculum_model.dart';
import 'package:flutter/services.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // Mock channels
  const MethodChannel channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, (MethodCall methodCall) async {
    return null;
  });

  group('Study Plan Persistence & Serialization Tests', () {
    test('TaskItem serialization (toJson and fromJson)', () {
      final task = TaskItem(
        id: 'task-test-123',
        title: 'Learn Integration',
        subtitle: 'Module 1 • 30 mins',
        subject: 'BS-M101',
        subjectColor: 'primary',
        completed: true,
        priority: 'high',
        difficulty: 'medium',
        estimatedDuration: '30 mins',
        urgent: false,
      );

      final jsonMap = task.toJson();
      expect(jsonMap['id'], equals('task-test-123'));
      expect(jsonMap['title'], equals('Learn Integration'));
      expect(jsonMap['completed'], isTrue);
      expect(jsonMap['priority'], equals('high'));

      final restoredTask = TaskItem.fromJson(jsonMap);
      expect(restoredTask.id, equals('task-test-123'));
      expect(restoredTask.title, equals('Learn Integration'));
      expect(restoredTask.completed, isTrue);
      expect(restoredTask.priority, equals('high'));
    });

    test('Defensive fromJson fallbacks', () {
      final emptyJson = <String, dynamic>{};
      final fallbackTask = TaskItem.fromJson(emptyJson);

      expect(fallbackTask.id, equals(''));
      expect(fallbackTask.title, equals(''));
      expect(fallbackTask.subjectColor, equals('primary'));
      expect(fallbackTask.completed, isFalse);
      expect(fallbackTask.priority, equals('medium'));
      expect(fallbackTask.difficulty, equals('medium'));
      expect(fallbackTask.estimatedDuration, equals('30 mins'));
      expect(fallbackTask.urgent, isFalse);
    });

    test('Overall Progress Formula Logic', () {
      double calculateProgressPercentage(int completed, int total) {
        if (total <= 0) return 0.0;
        return (completed / total) * 100;
      }

      expect(calculateProgressPercentage(0, 42), equals(0.0));
      expect(calculateProgressPercentage(10, 42), closeTo(23.8, 0.1));
      expect(calculateProgressPercentage(21, 42), equals(50.0));
      expect(calculateProgressPercentage(42, 42), equals(100.0));
    });
  });
}
