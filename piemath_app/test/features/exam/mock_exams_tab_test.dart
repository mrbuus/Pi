import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/exam/data/mock_exams.dart';

import '../../helpers/fake_http.dart';
import 'exam_test_app.dart';

final _soon = DateTime.now().toUtc().add(const Duration(days: 2, hours: 3));

Map<String, Object?> _event(String id, String title, DateTime start) => {
      'id': id,
      'title': title,
      'startsAt': start.toIso8601String(),
      'endsAt': start.add(const Duration(hours: 3)).toIso8601String(),
      'note': null,
      'timeLimitMin': 180,
      'problemCount': 40,
      'registered': 12,
      'phase': 'upcoming',
    };

FakeHttp _http({List<Map<String, Object?>> regs = const []}) => FakeHttp()
  ..json('GET', '/tests', <Object?>[])
  ..json('GET', '/exam-results/my', {'exams': <Object?>[]})
  ..json('GET', '/tests/my-results', <Object?>[])
  ..json('GET', '/catalog/mock-exams', {
    'live': null,
    'next': _event('e1', 'ЭЕШ жишиг сорил 3', _soon),
    'upcoming': [
      _event('e1', 'ЭЕШ жишиг сорил 3', _soon),
      _event('e2', 'ЭЕШ жишиг сорил 4', _soon.add(const Duration(days: 7))),
    ],
    'last': null,
  })
  ..json('GET', '/mock-exams/my', {'registrations': regs});

void main() {
  test('mockTimeLeft (вэбийн fmtLeft)', () {
    expect(mockTimeLeft(const Duration(days: 2, hours: 5)), '2 өдөр 5 цаг');
    expect(mockTimeLeft(const Duration(days: 1)), '1 өдөр');
    expect(mockTimeLeft(const Duration(hours: 3, minutes: 4)), '3 цаг 4 минут');
    expect(mockTimeLeft(const Duration(seconds: 20)), '1 минут');
    expect(mockTimeLeft(Duration.zero), 'одоо');
  });

  testWidgets('«Жишиг сорил» таб: ойрын сорил, дараагийн долоо хоног, бүртгүүлэх → POST', (tester) async {
    final http = _http()..json('POST', '/mock-exams/e1/register', {'ok': true});
    final app = ExamTestApp(http);
    await app.pump(tester, location: '/app/tests?tab=soril');
    await tester.pumpAndSettle();
    expect(find.text('ЭЕШ жишиг сорил 3'), findsOneWidget);
    expect(find.text('Дараагийн долоо хоногууд'), findsOneWidget);
    expect(find.text('ЭЕШ жишиг сорил 4'), findsOneWidget);
    expect(find.textContaining('Эхлэхэд 2 өдөр'), findsOneWidget);
    await tester.tap(find.text('Бүртгүүлэх').first);
    await tester.pumpAndSettle();
    expect(http.count('POST', '/mock-exams/e1/register'), 1);
    expect(find.text('Бүртгүүллээ, цагтаа эндээс эхлүүлээрэй'), findsOneWidget);
    await app.close(tester);
  });

  testWidgets('бүртгүүлсэн: «Бүртгүүлсэн», цуцлах → DELETE; дууссан бол дүн', (tester) async {
    final http = _http(
      regs: [
        {'eventId': 'e1', 'testId': 't1', 'status': 'NOT_STARTED', 'score': null, 'max': null},
        {'eventId': 'e2', 'testId': 't2', 'status': 'SUBMITTED', 'score': 31, 'max': 40},
      ],
    )..json('DELETE', '/mock-exams/e1/register', {'ok': true});
    final app = ExamTestApp(http);
    await app.pump(tester, location: '/app/tests?tab=soril');
    await tester.pumpAndSettle();
    expect(find.text('Бүртгүүлсэн'), findsNWidgets(2));
    expect(find.text('Дүн, байр харах 31/40'), findsOneWidget);
    await tester.tap(find.text('Цуцлах'));
    await tester.pumpAndSettle();
    expect(http.count('DELETE', '/mock-exams/e1/register'), 1);
    await app.close(tester);
  });

  testWidgets('хуваарь алдаа: дахин оролдох', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/tests', <Object?>[])
      ..json('GET', '/exam-results/my', {'exams': <Object?>[]})
      ..json('GET', '/tests/my-results', <Object?>[])
      ..error('GET', '/catalog/mock-exams', 500)
      ..json('GET', '/mock-exams/my', {'registrations': <Object?>[]});
    final app = ExamTestApp(http);
    await app.pump(tester, location: '/app/tests?tab=soril');
    await tester.pumpAndSettle();
    expect(find.text('Сорилын мэдээллийг ачаалж чадсангүй'), findsOneWidget);
    await app.close(tester);
  });
}
