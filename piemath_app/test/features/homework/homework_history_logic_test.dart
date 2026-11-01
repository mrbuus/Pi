import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/homework/data/homework_models.dart';
import 'package:piemath_app/features/homework/domain/homework_history_logic.dart';

HwMarkEntry _e(String date, String status, {String? comment}) => HwMarkEntry.fromJson({
      'date': '${date}T00:00:00.000Z',
      'status': status,
      'comment': comment,
      'classroom': {'id': 'c1', 'name': '12-р анги'},
    });

void main() {
  test('огноо: ISO-гийн эхний 10 тэмдэгт (цагийн бүс хөрвүүлэхгүй)', () {
    expect(_e('2026-10-27', 'DONE').date, '2026-10-27');
  });

  test('хоосон тайлбар null, ангийн нэр, тодорхойгүй төлөв «хийгээгүй» болно', () {
    final a = _e('2026-10-27', 'DONE', comment: '  ');
    expect(a.comment, isNull);
    expect(a.classroomName, '12-р анги');
    expect(_e('2026-10-27', 'BOGUS').mark, HomeworkMark.notDone);
    expect(HwMarkEntry.fromJson({'date': '2026-10-27', 'status': 'DONE'}).classroomName, '');
  });

  test('summarizeMarks', () {
    final s = summarizeMarks([_e('2026-10-01', 'DONE'), _e('2026-10-02', 'DONE'), _e('2026-10-03', 'PARTIAL'), _e('2026-10-04', 'NOT_DONE')]);
    expect((s.done, s.partial, s.notDone, s.total), (2, 1, 1, 4));
    expect(summarizeMarks(const []).total, 0);
  });

  test('groupMarksByMonth: шинэ сар эхэнд, сар доторх шинэ өдөр эхэнд', () {
    final g = groupMarksByMonth([
      _e('2026-09-15', 'DONE'),
      _e('2026-10-27', 'DONE'),
      _e('2026-10-29', 'PARTIAL'),
      _e('2026-09-20', 'NOT_DONE'),
    ]);
    expect([for (final (m, _) in g) m], ['2026-10', '2026-09']);
    expect([for (final e in g.first.$2) e.date], ['2026-10-29', '2026-10-27']);
    expect([for (final e in g.last.$2) e.date], ['2026-09-20', '2026-09-15']);
    expect(groupMarksByMonth(const []), isEmpty);
  });

  test('monthTitleMn', () {
    expect(monthTitleMn('2026-10'), '10-р сар');
    expect(monthTitleMn('2026-09'), '9-р сар');
    expect(monthTitleMn('xx'), 'xx');
  });
}
