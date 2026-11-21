import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/exam/data/exam_models.dart';
import 'package:piemath_app/features/exam/ui/widgets/exam_parts.dart';

/// Нэгдсэн шалгалт (цаасан горим): сонголтын A–E шошго, нээх/хаах цаг (Улаанбаатарын цагаар).
void main() {
  group('ExamProblem.choiceLabels', () {
    test('сервер шошго илгээвэл уншина', () {
      final p = ExamProblem.fromJson(const {
        'id': 'p1',
        'format': 'CHOICE',
        'choiceMode': 'TEXT',
        'choices': [r'$1$', r'$2$', r'$3$', r'$4$', r'$5$'],
        'choiceLabels': ['A', 'B', 'C', 'D', 'E'],
      });
      expect(p.choiceLabels, ['A', 'B', 'C', 'D', 'E']);
    });
    test('хуучин сервер, энгийн тест — null (дугаараар)', () {
      final p = ExamProblem.fromJson(const {
        'id': 'p1',
        'format': 'CHOICE',
        'choiceMode': 'TEXT',
        'choices': ['a', 'b'],
        'choiceLabels': null,
      });
      expect(p.choiceLabels, isNull);
    });
  });

  group('TestMeta цонх', () {
    test('ISO-г агшин болгоно', () {
      final m = TestMeta.fromJson(const {
        'id': 't1',
        'title': 'Нэгдсэн шалгалт 1-A',
        'opensAt': '2026-11-25T01:00:00.000Z',
        'closesAt': '2026-11-25T02:40:00.000Z',
      });
      expect(m.opensAt, DateTime.utc(2026, 11, 25, 1));
      expect(m.closesAt, DateTime.utc(2026, 11, 25, 2, 40));
    });
  });

  group('examWindowIntro', () {
    test('цонхгүй бол мөргүй', () => expect(examWindowIntro(null, null), isNull));
    test('UB цагаар, хоцорсон сурагчийн дүрэмтэй', () {
      final text = examWindowIntro(DateTime.utc(2026, 11, 25, 1), DateTime.utc(2026, 11, 25, 2, 40))!;
      expect(text, contains('2026.11.25 09:00'));
      expect(text, contains('2026.11.25 10:40'));
      expect(text, contains('хаах цаг хүртэл л'));
      expect(text, startsWith('Нээгдэх'));
    });
    test('зөвхөн хаах цаг', () {
      final text = examWindowIntro(null, DateTime.utc(2026, 11, 24, 18, 30))!;
      expect(text, startsWith('Хаагдах цаг 2026.11.25 02:30'));
    });
  });
}
