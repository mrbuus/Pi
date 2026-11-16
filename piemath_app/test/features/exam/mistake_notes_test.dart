import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/exam/data/exam_models.dart';

void main() {
  group('«Түгээмэл алдаа» загвар', () {
    test('хуучин сервер (талбаргүй) — хоосон, алдаагүй', () {
      final item = PracticeReviewItem.fromJson(const {'n': 1, 'answered': true});
      expect(item.mistakeNotes, isEmpty);
      final p = ReviewProblem.fromJson(const {
        'format': 'CHOICE',
        'choices': [
          {'letter': 'A', 'text': '1'},
        ],
      });
      expect(p.choices!.single.mistakeNote, isNull);
      expect(p.mistakeNotes, isEmpty);
    });

    test('/tests/:id/review — хоосон тайлбарыг алгасна', () {
      final item = PracticeReviewItem.fromJson(const {
        'n': 1,
        'mistakeNotes': [
          {'label': 'C', 'text': r'$3$', 'note': 'Тэмдгээ алдсан', 'mine': true},
          {'label': 'A', 'text': r'$1$', 'note': '  '},
          'буруу хэлбэр',
        ],
      });
      expect(item.mistakeNotes, hasLength(1));
      expect(item.mistakeNotes.single.mine, isTrue);
      expect(item.mistakeNotes.single.label, 'C');
    });

    test('сонголтын mistakeNote-оос — сурагчийнх эхэнд', () {
      final p = ReviewProblem.fromJson(const {
        'format': 'CHOICE',
        'myAnswer': 'C',
        'choices': [
          {'letter': 'A', 'text': '1', 'mistakeNote': 'Хуваахаа мартсан'},
          {'letter': 'B', 'text': '2', 'mistakeNote': null},
          {'letter': 'C', 'text': '3', 'mistakeNote': 'Тэмдгээ алдсан'},
        ],
      });
      expect([for (final n in p.mistakeNotes) n.label], ['C', 'A']);
      expect(p.mistakeNotes.first.mine, isTrue);
    });
  });
}
