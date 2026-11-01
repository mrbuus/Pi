import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/teacher/domain/test_run_row.dart';
import 'package:piemath_app/features/teacher/ui/test_run_screen.dart';

import '../../helpers/fake_http.dart';
import 'teacher_harness.dart';

Map<String, Object?> _row(String id, String first, {int? leave, int? shot, int? rec}) => {
  'id': id,
  'totalScore': 18,
  'maxScore': 20,
  'source': 'ONLINE_TEST',
  'student': {'id': 's$id', 'firstName': first, 'lastName': 'Бат'},
  'leaveCount': leave,
  'screenshotCount': shot,
  'recordingCount': rec,
};

void main() {
  test('TestRunRow.indicators: зөвхөн > 0, null/0 нуугдана', () {
    final r = TestRunRow.fromJson(_row('1', 'А', leave: 2, shot: 0, rec: 1));
    expect(r.indicators.map((i) => (i.kind, i.count)), [(IntegrityKind.leave, 2), (IntegrityKind.recording, 1)]);
    expect(TestRunRow.fromJson(_row('2', 'Б')).indicators, isEmpty);
  });

  testWidgets('шалгалтын дүн: үзүүлэлт зөвхөн > 0, тайлбар доор, автомат дүгнэлт биш', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/tests/t1/results', [
        _row('1', 'Тэмүүжин', leave: 2, shot: 1, rec: 1),
        _row('2', 'Сараа', leave: 0, shot: null, rec: null),
      ]);
    await pumpTeacher(tester, const TestRunScreen(testId: 't1', title: 'Сорил 3'), http: http);
    await settle(tester);
    expect(find.text('Тэмүүжин Бат'), findsOneWidget);
    expect(find.text('Гарсан 2'), findsOneWidget);
    expect(find.text('Скриншот 1'), findsOneWidget);
    expect(find.text('Бичлэг 1'), findsOneWidget);
    expect(find.textContaining('Гарсан 0'), findsNothing);
    expect(find.textContaining('автомат дүгнэлт биш'), findsOneWidget);
  });

  testWidgets('алдаа → дахин оролдох', (tester) async {
    final http = FakeHttp()..on('GET', '/tests/t1/results', (_) => const FakeResponse(null, status: 500));
    await pumpTeacher(tester, const TestRunScreen(testId: 't1'), http: http);
    await settle(tester, frames: 40);
    expect(find.text('Дахин оролдох'), findsOneWidget);
  });
}
