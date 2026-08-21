import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const MethodChannel channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, (MethodCall methodCall) async {
    return null;
  });

  group('Custom Syllabus Parsing and Mapping Tests', () {
    test('Verify Defensive Subject Extraction Logic from raw map', () {
      // Helper function to extract name just like the UI does:
      String extractName(Map<String, dynamic> sub) {
        String name = (sub['name'] ?? sub['subjectName'] ?? sub['title'] ?? sub['subject'] ?? '').toString().trim();
        final String code = (sub['code'] ?? sub['subjectCode'] ?? '').toString().trim();
        if (name.isEmpty) {
          if (code.isNotEmpty) {
            name = "Subject $code";
          } else {
            name = "Extraction Warning: Missing Subject Name";
          }
        }
        return name;
      }

      // Check standard name field
      expect(extractName({'name': 'Maths', 'code': 'M101'}), equals('Maths'));
      
      // Check subjectName field fallback
      expect(extractName({'subjectName': 'Physics', 'code': 'P101'}), equals('Physics'));
      
      // Check title field fallback
      expect(extractName({'title': 'Chemistry', 'code': 'C101'}), equals('Chemistry'));
      
      // Check subject field fallback
      expect(extractName({'subject': 'English', 'code': 'E101'}), equals('English'));
      
      // Check recovery from code only
      expect(extractName({'code': 'ES-CS201'}), equals('Subject ES-CS201'));

      // Check missing fields warning
      expect(extractName({}), equals('Extraction Warning: Missing Subject Name'));
    });
  });
}
