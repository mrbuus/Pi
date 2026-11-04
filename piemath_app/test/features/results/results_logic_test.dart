import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/features/results/data/results_models.dart';
import 'package:piemath_app/features/results/domain/results_logic.dart';

import 'results_fixtures.dart';

List<ResultRow> _rows() => [for (final r in resultRows) ResultRow.fromJson(r)];

ResultRow _row(String sid, String first, num total, {num max = 40, String source = 'CHAPTER_EXAM', int? leave}) =>
    ResultRow.fromJson(resultRow('r$sid', sid, first, 'Овог', total: total, max: max, source: source, leave: leave));

void main() {
  group('Эрх', () {
    test('Админ, Багш+ онлайн дүнг засна; Багш зөвхөн цаасан; сурагч харахгүй', () {
      final online = _row('a', 'А', 30, source: 'ONLINE_TEST');
      final paper = _row('b', 'Б', 30);
      for (final role in [UserRole.admin, UserRole.teacherPlus]) {
        final a = ResultsAccess(role);
        expect(a.canView, isTrue);
        expect(a.canReenter(online), isTrue);
        expect(a.canReenter(paper), isTrue);
        expect(a.needsReason(online), isTrue);
        expect(a.needsReason(paper), isFalse);
      }
      const t = ResultsAccess(UserRole.teacher);
      expect(t.canView, isTrue);
      expect(t.canEnter, isTrue);
      expect(t.canOverrideOnline, isFalse);
      expect(t.canReenter(online), isFalse);
      expect(t.canReenter(paper), isTrue);
      for (final role in [UserRole.student, UserRole.parent, UserRole.buyer, null]) {
        final a = ResultsAccess(role);
        expect(a.canView, isFalse);
        expect(a.canReenter(paper), isFalse);
      }
    });
  });

  group('Эрэмбэ', () {
    test('анхдагч: оноогоор буурахаар', () {
      expect(sortResults(_rows(), ResultSort.initial).map((r) => r.studentId), ['s1', 's2', 's4']);
    });

    test('ижил түлхүүр чиглэл солино, шинэ нэр өсөхөөр, бусад буурахаар', () {
      const s = ResultSort.initial;
      expect(s.toggle(ResultSortKey.score), const ResultSort(ResultSortKey.score, ascending: true));
      expect(s.toggle(ResultSortKey.name), const ResultSort(ResultSortKey.name, ascending: true));
      expect(
        const ResultSort(ResultSortKey.name, ascending: true).toggle(ResultSortKey.percent),
        const ResultSort(ResultSortKey.percent),
      );
    });

    test('нэр: монгол цагаан толгойн дараалал (Ө нь О-гийн дараа, П-гийн өмнө)', () {
      final rows = [_row('1', 'Пүрэв', 1), _row('2', 'Өлзий', 1), _row('3', 'Од', 1), _row('4', 'Анар', 1)];
      final sorted = sortResults(rows, const ResultSort(ResultSortKey.name, ascending: true));
      expect(sorted.map((r) => r.run.name.split(' ').first), ['Анар', 'Од', 'Өлзий', 'Пүрэв']);
    });

    test('хувь: maxScore 0 мөр буурахад хамгийн сүүлд', () {
      final rows = [_row('1', 'А', 0, max: 0), _row('2', 'Б', 20, max: 40), _row('3', 'В', 9, max: 10)];
      final sorted = sortResults(rows, const ResultSort(ResultSortKey.percent));
      expect(sorted.map((r) => r.studentId), ['3', '2', '1']);
      expect(sorted.last.percent, isNull);
    });
  });

  group('Шүүлтүүр, нэгтгэл', () {
    test('бүлэг, анхаарах, онлайн/цаасан, хайлт, анги', () {
      final rows = _rows();
      bool f(String id, String sid) => ResultFilters.test(rows.firstWhere((r) => r.studentId == sid), id);
      expect(f(ResultFilters.good, 's1'), isTrue); // 90%
      expect(f(ResultFilters.mid, 's2'), isTrue); // 75%
      expect(f(ResultFilters.low, 's4'), isTrue); // 25%
      expect(f(ResultFilters.flagged, 's2'), isTrue);
      expect(f(ResultFilters.flagged, 's1'), isFalse);
      expect(f(ResultFilters.online, 's2'), isTrue);
      expect(f(ResultFilters.paper, 's2'), isFalse);
      expect(resultMatches(rows.first, 'анар'), isTrue);
      expect(inClass(rows, {'s1', 's2'}).map((r) => r.studentId), ['s1', 's2']);
      expect(inClass(rows, null), hasLength(3));
      expect(bandOf(null), ScoreBand.none);
      expect(bandOf(80), ScoreBand.good);
      expect(bandOf(79), ScoreBand.mid);
      expect(bandOf(49), ScoreBand.low);
    });

    test('ангийн дундаж ба тархалт; maxScore 0 мөрийг тооцохгүй', () {
      final s = ResultsStats.of([..._rows(), _row('z', 'Я', 0, max: 0)])!;
      expect(s.total, 3);
      expect(s.avgPct, 63); // (90 + 75 + 25) / 3
      expect((s.good, s.mid, s.low), (1, 1, 1));
      expect(ResultsStats.of(const []), isNull);
    });

    test('бөөнөөр оруулах анги: оноосон анги, эс бөгөөс бүх анги', () {
      const all = [ClassOption(id: 'c1', name: '12А'), ClassOption(id: 'c2', name: '11Б')];
      final meta = TestMeta.fromJson(testMetaJson);
      expect(classOptionsFor(meta, all), [all.first]);
      expect(classOptionsFor(TestMeta.fromJson(const {'id': 't', 'title': 'x', 'access': []}), all), all);
      expect(classOptionsFor(null, all), all);
    });
  });

  group('Оноо оруулах', () {
    test('тоо задлах, хязгаар, сэжигтэй 0', () {
      expect(parseScore('12,5'), 12.5);
      expect(parseScore(' '), isNull);
      expect(parseScore('a'), isNull);
      expect(scoreRangeError('', 40), isNull);
      expect(scoreRangeError('x', 40), 'Тоо оруулна уу');
      expect(scoreRangeError('41', 40), '0–40 хооронд байх ёстой');
      expect(scoreRangeError('-1', 40), '0–40 хооронд байх ёстой');
      expect(scoreRangeError('40', 40), isNull);
      final had = _row('s', 'А', 30);
      expect(isSuspiciousZero('0', had), isTrue);
      expect(isSuspiciousZero('0', null), isFalse);
      expect(isSuspiciousZero('5', had), isFalse);
    });

    test('анхны төлөв: дүнтэй нь түгжээтэй; хадгалах мөр зөвхөн түгжээгүй, хүчинтэй', () {
      const roster = [
        RosterStudent(id: 's1', firstName: 'Анар', lastName: 'Бат'),
        RosterStudent(id: 's3', firstName: 'Нараа', lastName: 'Ган'),
        RosterStudent(id: 's5', firstName: 'Сод', lastName: 'Ган'),
        RosterStudent(id: 's6', firstName: 'Төгс', lastName: 'Ган'),
      ];
      final existing = {for (final r in _rows()) r.studentId: r};
      var entries = initialEntries(roster, existing);
      expect(entries['s1']!.locked, isTrue);
      expect(entries['s1']!.value, '36');
      expect(entries['s3']!.locked, isFalse);
      entries = {...entries, 's3': entries['s3']!.copyWith(value: '20'), 's5': entries['s5']!.copyWith(value: '99')};
      expect(saveCandidates(roster, entries, 40).map((s) => s.id), ['s3']);
      expect(filledCount(roster, entries), 3);
    });
  });

  test('CSV: BOM, толгой, эх сурвалж, бүрэн бүтэн байдал', () {
    final csv = resultsCsv(sortResults(_rows(), ResultSort.initial));
    expect(csv.startsWith('\u{FEFF}'), isTrue);
    final lines = csv.trim().split('\r\n');
    expect(lines, hasLength(4));
    expect(lines.first, contains('"Горимоос гарсан тоо"'));
    expect(lines[2], '2,"Өлзий Дорж",30.0,40.0,75,"Онлайн",2,0,0');
  });

  test('зөв хувийн өнгө: 70, 40 босго', () {
    expect(correctTone(null), CorrectTone.none);
    expect(correctTone(70), CorrectTone.good);
    expect(correctTone(69), CorrectTone.mid);
    expect(correctTone(40), CorrectTone.mid);
    expect(correctTone(39), CorrectTone.low);
  });
}
