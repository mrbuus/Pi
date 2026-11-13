import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/teacher/domain/board_logic.dart';
import 'package:piemath_app/features/teacher/domain/quiz_score.dart';
import 'package:piemath_app/shared/marks/marks.dart';

// = api/src/homework-quiz/quiz-score.spec.ts-ийн хил (вэб, API, апп ижил дүн).
void main() {
  group('Өнгөний хил (эзэн 2026-11-08): 0 <= улаан < 50 <= улбар шар < 80 <= ногоон', () {
    test('бүхэл ба бутархай хил', () {
      expect(quizTone(0, 10), MarkTone.error);
      expect(quizTone(4.99, 10), MarkTone.error);
      expect(quizTone(5, 10), MarkTone.warning);
      expect(quizTone(7.99, 10), MarkTone.warning);
      expect(quizTone(8, 10), MarkTone.success);
      expect(quizTone(10, 10), MarkTone.success);
      // 49,99% = 4999/10000
      expect(quizTone(49.99, 100), MarkTone.error);
      expect(quizTone(79.99, 100), MarkTone.warning);
      // 1/3 = 33,3% — хөвөгч тооны алдаагүй
      expect(quizTone(1, 3), MarkTone.error);
      expect(quizTone(2.4, 3), MarkTone.success);
    });

    test('оноогүй эсвэл буруу тоо → өнгөгүй', () {
      expect(quizTone(null, 10), isNull);
      expect(quizTone(5, 0), isNull);
      expect(quizPercent(null, 10), isNull);
    });

    test('хувийг доош тайрна — бичиг, өнгө зөрөхгүй', () {
      expect(formatPercent(quizPercent(7.99, 10)!), '79%');
      expect(formatPercent(quizPercent(8, 10)!), '80%');
      expect(formatPercent(quizPercent(2, 3)!), '66%');
      expect(percentTone(79.99), MarkTone.warning);
      expect(percentTone(80), MarkTone.success);
    });
  });

  test('бичлэг: 7.5 → «7,5», 8 → «8», 7.25 → «7,25», 7.05 → «7,05»', () {
    expect(formatScore(7.5), '7,5');
    expect(formatScore(8), '8');
    expect(formatScore(7.25), '7,25');
    expect(formatScore(7.05), '7,05');
    expect(formatScore(0), '0');
  });

  group('оролт', () {
    test('оноо: таслал/цэг, 2 хүртэл орон, 0..max', () {
      expect(parseScoreInput('', 10).value, isNull);
      expect(parseScoreInput('', 10).ok, isTrue);
      expect(parseScoreInput('7,5', 10).value, 7.5);
      expect(parseScoreInput('7.25', 10).value, 7.25);
      expect(parseScoreInput('08', 10).value, 8);
      expect(parseScoreInput('10', 10).ok, isTrue);
      expect(parseScoreInput('10,01', 10).error, '0-ээс 10 хүртэл');
      expect(parseScoreInput('7,555', 10).error, 'Тоо, бутархай нь 2 хүртэл оронтой (7,5)');
      expect(parseScoreInput('а', 10).ok, isFalse);
    });

    test('бодлогын тоо: бүхэл 1..200', () {
      expect(parseProblemCount('10').value, 10);
      expect(parseProblemCount('0').error, '1-ээс 200 хүртэл');
      expect(parseProblemCount('201').error, '1-ээс 200 хүртэл');
      expect(parseProblemCount('').error, 'Бодлогын тоог бүхэл тоогоор');
    });

    test('бичих үед зөвхөн цифр ба ганц таслал', () {
      expect(sanitizeScoreText('7,5,3'), '7,53');
      expect(sanitizeScoreText('7а.5'), '7.5');
      expect(sanitizeScoreText('1234567'), '123456');
    });
  });

  test('дундаж зөвхөн оноотойгоор, өнгө бүхэл тоогоор', () {
    expect(quizAverage([null, null], 10), isNull);
    final a = quizAverage([8, null, 6], 10)!;
    expect(a.count, 2);
    expect(a.pct, 70);
    expect(a.tone, MarkTone.warning);
    expect(quizAverage([8, 8], 10)!.tone, MarkTone.success);
    expect(meanPercent([(score: 5, problemCount: 10), (score: 10, problemCount: 10)]), 75);
    expect(meanPercent(const []), isNull);
  });

  test('«Асуудалтай» босго (minQuiz): 0 бол унтарсан', () {
    expect(quizBelow(4, 10, 50), isTrue);
    expect(quizBelow(5, 10, 50), isFalse);
    expect(quizBelow(0, 10, 0), isFalse);
  });

  test('сарын «Тэмдэглээгүй»-г шалгалтын өдрөөр засна', () {
    expect(quizCoveredDays(['01', '02', '03'], ['01'], ['02', '01']), 1);
  });

  group('самбарын дүрэм: шалгалтын оноотой = даалгаврыг шалгасан', () {
    const ids = ['s1', 's2', 's3'];
    final recs = {
      's1': const DayRec(att: AttendanceStatus.present),
      's2': const DayRec(att: AttendanceStatus.present),
      's3': const DayRec(att: AttendanceStatus.absent),
    };

    test('«Бүгд хийсэн»-д орохгүй, алгасах тоонд ч орохгүй', () {
      expect(bulkDoneCandidates(ids, recs), ['s1', 's2']);
      expect(bulkDoneCandidates(ids, recs, quizScored: {'s1'}), ['s2']);
      expect(bulkDoneSkipped(ids, recs), 1);
      expect(bulkDoneSkipped(ids, recs, quizScored: {'s3'}), 0);
    });

    test('«Тэмдэглээгүй» шүүлтүүр ба тоо', () {
      final data = BoardFilterData(recs: recs, risk: const {}, sent: const {}, online: const {}, quiz: const {'s2'});
      expect(data.apply(BoardFilter.hwNone, ids), ['s1', 's3']);
      expect(quizCoveredUnmarked(ids, recs, {'s2'}), 1);
    });

    test('илгээсэн ч оноотой бол «Шалгаагүй» биш', () {
      const r = DayRec(att: AttendanceStatus.present);
      expect(awaitingCheck(r, homework: true, sent: true), isTrue);
      expect(awaitingCheck(r, homework: true, sent: true, quizScored: true), isFalse);
    });
  });
}
