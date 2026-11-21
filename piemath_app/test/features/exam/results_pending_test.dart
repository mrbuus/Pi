import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/exam/data/exam_models.dart';
import 'package:piemath_app/features/teacher/domain/test_run_row.dart';

void main() {
  group('Нэгдсэн шалгалт: хаах цаг хүртэл дүн нуугдана', () {
    test('resultsPending задлагдана; хуучин сервер — null', () {
      final p = PracticeReview.fromJson(const {
        'result': null,
        'items': <Object?>[],
        'resultsPending': {
          'releaseAt': '2026-11-25T03:40:00.000Z',
          'message': 'Хариу хүлээн авлаа. Дүн, бодолт 11:40 цагт нээгдэнэ',
        },
        'lateAnswers': true,
      });
      expect(p.result, isNull);
      expect(p.resultsPending?.message, endsWith('нээгдэнэ'));
      expect(p.resultsPending?.releaseAt, DateTime.utc(2026, 11, 25, 3, 40));
      expect(p.lateAnswers, isTrue);
      expect(PracticeReview.fromJson(const {'items': <Object?>[]}).resultsPending, isNull);
    });

    test('submit: оноогүй хариу (result null) нь 0/0 биш', () {
      final s = SubmitOutcome.fromJson(const {'result': null, 'graded': <Object?>[], 'answersReceived': true});
      expect(s.result, isNull);
      expect(s.answersReceived, isTrue);
      expect(s.alreadyClosed, isFalse);
    });

    test('autosave хариуны баталгаа — хуучин сервер илгээхгүй бол false', () {
      expect(SaveResponse.fromJson(const {'status': 'SUBMITTED'}).answersReceived, isFalse);
      expect(SaveResponse.fromJson(const {'status': 'IN_PROGRESS', 'answersReceived': true}).answersReceived, isTrue);
    });
  });

  test('багшийн дүн: «Хоцорч ирсэн хариу» шошго, хүлээн авсны дараа өмнөх оноо', () {
    final pending = TestRunRow.fromJson(const {
      'id': 'r1',
      'student': {'id': 's1', 'firstName': 'Бат', 'lastName': 'Болд'},
      'totalScore': 3,
      'maxScore': 10,
      'lateAnswers': {'pending': true, 'differing': 2, 'canAccept': true},
    });
    expect(pending.late?.label, 'Хоцорч ирсэн хариу: 2 бодлого зөрүүтэй');
    expect(pending.late?.canAccept, isTrue);
    final done = TestRunRow.fromJson(const {
      'id': 'r1',
      'totalScore': 5,
      'maxScore': 10,
      'lateAnswers': {
        'pending': false,
        'differing': 0,
        'previousScore': {'totalScore': 3, 'maxScore': 10},
      },
    });
    expect(done.late?.label, 'Хоцорсон хариу хүлээн авсан (өмнө 3/10)');
    expect(TestRunRow.fromJson(const {'id': 'x'}).late, isNull);
  });
}
