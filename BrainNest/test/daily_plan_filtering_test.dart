import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:brainnest/providers/curriculum_provider.dart';
import 'package:brainnest/providers/planner_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const MethodChannel channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, (MethodCall methodCall) async {
    if (methodCall.method == 'read') {
      return null;
    }
    return null;
  });

  group('Daily Study Plan Subject Filtering Tests', () {
    test('Verify static topics and daily plan generation for all subjects', () async {
      final curriculum = CurriculumProvider();
      
      // Mock profile for Semester 1 (e.g. Mathematics - IA, Physics - I, Basic Electrical, Engineering Graphics)
      final profileSem1 = {
        'name': 'Test Student Sem 1',
        'semester': '1',
      };
      
      await curriculum.loadCurriculum(profileSem1);
      
      // Check subjects loaded
      final subjectsSem1 = curriculum.subjects;
      print('Sem 1 Subjects: ${subjectsSem1.map((s) => s.name).toList()}');
      
      expect(subjectsSem1.any((s) => s.code == 'BS-M101'), isTrue); // Mathematics - IA
      expect(subjectsSem1.any((s) => s.code == 'BS-PH101'), isTrue); // Physics - I
      expect(subjectsSem1.any((s) => s.code == 'ES-EE101'), isTrue); // Basic Electrical
      expect(subjectsSem1.any((s) => s.code == 'ES-ME191'), isTrue); // Engineering Graphics
      
      final planner = PlannerProvider();
      
      // Test A: Mathematics - IA
      planner.generatePlan('good', 'BS-M101', curriculum);
      expect(planner.dailyTasks.isNotEmpty, isTrue);
      print('BS-M101 (Math) Daily Tasks:');
      for (var task in planner.dailyTasks) {
        print('- ${task.title} | ${task.subtitle} | Subject: ${task.subject}');
        expect(task.subject, equals('BS-M101'));
        expect(task.subtitle.contains("Instance of 'CurriculumTopic"), isFalse);
        expect(task.title.contains("Instance of 'CurriculumTopic"), isFalse);
      }
      
      // Test B: Physics - I
      planner.generatePlan('good', 'BS-PH101', curriculum);
      expect(planner.dailyTasks.isNotEmpty, isTrue);
      print('BS-PH101 (Physics) Daily Tasks:');
      for (var task in planner.dailyTasks) {
        print('- ${task.title} | ${task.subtitle} | Subject: ${task.subject}');
        expect(task.subject, equals('BS-PH101'));
        expect(task.subtitle.contains("Instance of 'CurriculumTopic"), isFalse);
        expect(task.title.contains("Instance of 'CurriculumTopic"), isFalse);
      }
      
      // Test C: Basic Electrical Engineering
      planner.generatePlan('good', 'ES-EE101', curriculum);
      expect(planner.dailyTasks.isNotEmpty, isTrue);
      print('ES-EE101 (Electrical) Daily Tasks:');
      for (var task in planner.dailyTasks) {
        print('- ${task.title} | ${task.subtitle} | Subject: ${task.subject}');
        expect(task.subject, equals('ES-EE101'));
        expect(task.subtitle.contains("Instance of 'CurriculumTopic"), isFalse);
        expect(task.title.contains("Instance of 'CurriculumTopic"), isFalse);
      }
      
      // Test D: Engineering Graphics & Design
      planner.generatePlan('good', 'ES-ME191', curriculum);
      expect(planner.dailyTasks.isNotEmpty, isTrue);
      print('ES-ME191 (Graphics) Daily Tasks:');
      for (var task in planner.dailyTasks) {
        print('- ${task.title} | ${task.subtitle} | Subject: ${task.subject}');
        expect(task.subject, equals('ES-ME191'));
        expect(task.subtitle.contains("Instance of 'CurriculumTopic"), isFalse);
        expect(task.title.contains("Instance of 'CurriculumTopic"), isFalse);
      }
    });

    test('Verify daily plan generation for Semester 2 subjects', () async {
      final curriculum = CurriculumProvider();
      
      // Mock profile for Semester 2 (e.g. Mathematics - IIA, Chemistry - I, English, Programming)
      final profileSem2 = {
        'name': 'Test Student Sem 2',
        'semester': '2',
      };
      
      await curriculum.loadCurriculum(profileSem2);
      
      // Check subjects loaded
      final subjectsSem2 = curriculum.subjects;
      print('Sem 2 Subjects: ${subjectsSem2.map((s) => s.name).toList()}');
      
      expect(subjectsSem2.any((s) => s.code == 'BS-M201'), isTrue); // Mathematics - IIA
      expect(subjectsSem2.any((s) => s.code == 'BS-CH201'), isTrue); // Chemistry - I
      expect(subjectsSem2.any((s) => s.code == 'HM-HU201'), isTrue); // English
      expect(subjectsSem2.any((s) => s.code == 'ES-CS201'), isTrue); // Programming
      
      final planner = PlannerProvider();
      
      // Test E: Mathematics - IIA
      planner.generatePlan('good', 'BS-M201', curriculum);
      expect(planner.dailyTasks.isNotEmpty, isTrue);
      print('BS-M201 (Math II) Daily Tasks:');
      for (var task in planner.dailyTasks) {
        print('- ${task.title} | ${task.subtitle} | Subject: ${task.subject}');
        expect(task.subject, equals('BS-M201'));
        expect(task.subtitle.contains("Instance of 'CurriculumTopic"), isFalse);
      }

      // Test F: Chemistry - I
      planner.generatePlan('good', 'BS-CH201', curriculum);
      expect(planner.dailyTasks.isNotEmpty, isTrue);
      print('BS-CH201 (Chemistry) Daily Tasks:');
      for (var task in planner.dailyTasks) {
        print('- ${task.title} | ${task.subtitle} | Subject: ${task.subject}');
        expect(task.subject, equals('BS-CH201'));
        expect(task.subtitle.contains("Instance of 'CurriculumTopic"), isFalse);
      }

      // Test G: Programming for Problem Solving
      planner.generatePlan('good', 'ES-CS201', curriculum);
      expect(planner.dailyTasks.isNotEmpty, isTrue);
      print('ES-CS201 (Programming) Daily Tasks:');
      for (var task in planner.dailyTasks) {
        print('- ${task.title} | ${task.subtitle} | Subject: ${task.subject}');
        expect(task.subject, equals('ES-CS201'));
        expect(task.subtitle.contains("Instance of 'CurriculumTopic"), isFalse);
      }

      // Test H: English
      planner.generatePlan('good', 'HM-HU201', curriculum);
      expect(planner.dailyTasks.isNotEmpty, isTrue);
      print('HM-HU201 (English) Daily Tasks:');
      for (var task in planner.dailyTasks) {
        print('- ${task.title} | ${task.subtitle} | Subject: ${task.subject}');
        expect(task.subject, equals('HM-HU201'));
        expect(task.subtitle.contains("Instance of 'CurriculumTopic"), isFalse);
      }
    });
  });
}
