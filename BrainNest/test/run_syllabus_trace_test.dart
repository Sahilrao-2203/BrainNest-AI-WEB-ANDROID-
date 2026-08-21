import 'dart:io';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:brainnest/providers/curriculum_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const MethodChannel channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, (MethodCall methodCall) async {
    if (methodCall.method == 'read') {
      return null;
    }
    return null;
  });

  test('End-to-End Syllabus AI Parsing Test', () async {
    HttpOverrides.global = null;
    final file = File('C:\\Users\\ANTRA\\Desktop\\BTECH1.pdf');
    expect(file.existsSync(), isTrue);

    final bytes = file.readAsBytesSync();
    final provider = CurriculumProvider();

    // 1. Extract text
    final text = await provider.extractTextFromPdf(bytes);
    expect(text.trim().isNotEmpty, isTrue);
    print('Extracted character length: ${text.length}');

    // 2. Run analysis (takes ~100s, timeout is 3m)
    final result = await provider.parseSyllabusWithAi(text);
    expect(result, isNotNull);

    // 3. Completeness validations
    final subjects = result!['subjects'] as List<dynamic>? ?? [];
    expect(subjects.length, greaterThan(0));

    int unitsCount = 0;
    int topicsCount = 0;
    for (final s in subjects) {
      final units = s['units'] as List<dynamic>? ?? [];
      unitsCount += units.length;
      for (final u in units) {
        final topics = u['topics'] as List<dynamic>? ?? [];
        topicsCount += topics.length;
      }
    }

    print('Subjects count: ${subjects.length}');
    print('Units count: $unitsCount');
    print('Topics count: $topicsCount');

    expect(unitsCount, greaterThan(0));
    expect(topicsCount, greaterThan(0));
  }, timeout: const Timeout(Duration(minutes: 5)));
}
