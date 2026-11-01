import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/integrity/integrity.dart';
import 'package:piemath_app/features/exam/ui/exam_screen.dart';
import 'package:piemath_app/features/exam/ui/result_screens.dart';
import 'package:piemath_app/features/exam/ui/tests_list_screen.dart';
import 'package:piemath_app/features/exam/ui/widgets/exam_parts.dart';

import '../../helpers/fake_http.dart';
import 'exam_test_app.dart';

void main() {
  testWidgets('бүтэн урсгал: интро → эхлэх → хариулах → офлайн → сэргэх → илгээх → эргэн харалт', (tester) async {
    var online = true;
    final patches = <Map<String, Object?>>[];
    final http = FakeHttp()
      ..json('GET', '/tests/t1', fakeMeta())
      ..json('POST', '/tests/t1/start', fakeStart())
      ..on('PATCH', '/tests/t1/session', (req) {
        if (!online) return const FakeResponse.network();
        patches.add((req.data as Map).cast<String, Object?>());
        return const FakeResponse({'status': 'IN_PROGRESS', 'leaveCount': 0, 'remainingSec': 2300});
      })
      ..json('POST', '/tests/t1/submit', {
        'result': {'totalScore': 2, 'maxScore': 2},
        'graded': <Object?>[],
      })
      ..json('GET', '/tests/t1/review', {
        'result': {'totalScore': 2, 'maxScore': 2, 'createdAt': '2026-11-01T03:00:00.000Z'},
        'items': [
          {'n': 1, 'points': 1, 'statementText': r'$2^{x}=8$', 'answered': true, 'correct': true, 'myAnswer': r'$3$'},
          {'n': 2, 'points': 1, 'statementText': 'Нөхөх', 'answered': true, 'correct': true, 'myAnswer': '59'},
        ],
        'leaveCount': 0,
      });
    final app = ExamTestApp(http);
    await app.pump(tester, location: '/app/tests/t1');

    // Интро: гарах дүрмийг УРЬДЧИЛАН хэлнэ.
    expect(find.byType(ExamIntroView), findsOneWidget);
    expect(find.textContaining('3 дахь удаад шалгалт автоматаар илгээгдэнэ'), findsOneWidget);
    expect(find.textContaining('2 секундээс богино'), findsOneWidget);
    await tester.tap(find.text('Шалгалт эхлүүлэх'));
    await ExamTestApp.settle(tester);
    await tester.tap(find.text('Эхлэх'));
    await ExamTestApp.settle(tester);

    expect(find.text('1-р бодлого'), findsOneWidget);
    expect(app.guard!.isActive, isTrue);
    expect(find.text('40:00'), findsOneWidget);

    // Сонголт (холилдсон дарааллын 3-р = индекс 2).
    await tester.tap(find.bySemanticsLabel(RegExp(r'^3 хариулт')));
    await tester.pump(const Duration(milliseconds: 1300));
    await ExamTestApp.settle(tester, 2);
    expect(patches.last['answers'], {'p1': 2});
    expect(find.text('1/2 хариулсан'), findsOneWidget);

    // Офлайн болоод нөхөх бодлогод хариулна.
    online = false;
    await tester.tap(find.text('Дараах'));
    await ExamTestApp.settle(tester, 4);
    expect(find.text('2-р бодлого'), findsOneWidget);
    await tester.tap(find.widgetWithText(OutlinedButton, '5'));
    await tester.tap(find.widgetWithText(OutlinedButton, '9'));
    await tester.pump(const Duration(milliseconds: 1300));
    // ApiClient-ийн сүлжээний нэг удаагийн давталт (0-1с jitter).
    await tester.pump(const Duration(seconds: 1));
    await ExamTestApp.settle(tester, 2);
    expect(find.byType(ExamOfflineBanner), findsOneWidget);
    expect(find.text('Утсанд хадгалсан'), findsOneWidget);

    // Сүлжээ сэргэв — backoff (2с орчим) дараа хариу илгээгдэнэ.
    online = true;
    await tester.pump(const Duration(seconds: 3));
    await ExamTestApp.settle(tester, 2);
    expect(patches.last['answers'], {'p2': '59'});
    expect(find.byType(ExamOfflineBanner), findsNothing);

    // Илгээх.
    await tester.tap(find.text('Шалгах'));
    await ExamTestApp.settle(tester);
    expect(find.text('Илгээхээсээ өмнө шалгах'), findsOneWidget);
    await tester.tap(find.text('Шалгалт илгээх'));
    await ExamTestApp.settle(tester, 20);
    expect(http.count('POST', '/tests/t1/submit'), 1);
    final submitted = http.requests.lastWhere((r) => r.path == '/tests/t1/submit').data as Map;
    expect(submitted['answers'], {'p1': 2, 'p2': '59'});
    expect(app.guard!.isActive, isFalse);

    // Дасгал тест → эргэн харалт.
    expect(find.byType(ReviewScreen), findsOneWidget);
    expect(find.text('2 / 2'), findsOneWidget);
    await app.close(tester);
  });

  testWidgets('аппаас гараад буцахад тайван тайлбар; бичлэгийн үед агуулга нуугдана', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/tests/t1', fakeMeta(status: 'IN_PROGRESS'))
      ..json('POST', '/tests/t1/start', fakeStart(draft: {'p1': 0}))
      ..json('PATCH', '/tests/t1/session', {'status': 'IN_PROGRESS', 'leaveCount': 1, 'remainingSec': 2000});
    final app = ExamTestApp(http);
    await app.pump(tester, location: '/app/tests/t1');
    // Үргэлжлүүлэх үед баталгаажуулах цонхгүй.
    await tester.tap(find.text('Үргэлжлүүлэх'));
    await ExamTestApp.settle(tester);
    expect(find.text('1/2 хариулсан'), findsOneWidget);

    app.guard!.emit(IntegrityEventType.backgrounded);
    await tester.pump(const Duration(seconds: 3));
    app.guard!.emit(IntegrityEventType.resumed);
    await ExamTestApp.settle(tester, 4);
    expect(find.byType(LeaveNoticeView), findsOneWidget);
    expect(find.text('Шалгалтын үеэр аппаас гарсан нь багшид харагдана'), findsOneWidget);
    expect(find.text('2 удаа үлдсэн'), findsOneWidget);
    await tester.tap(find.text('Үргэлжлүүлэх'));
    await ExamTestApp.settle(tester, 4);
    expect(find.byType(LeaveNoticeView), findsNothing);
    expect(
      http.requests.where((r) => r.path == '/tests/t1/session' && (r.data as Map)['event'] == 'LEAVE'),
      hasLength(1),
    );

    app.guard!.emit(IntegrityEventType.recordingStarted);
    await ExamTestApp.settle(tester, 2);
    expect(find.byType(RecordingCover), findsOneWidget);
    expect(find.text('1-р бодлого'), findsOneWidget); // доор нь байгаа ч халхлагдсан
    app.guard!.emit(IntegrityEventType.recordingStopped);
    await ExamTestApp.settle(tester, 2);
    expect(find.byType(RecordingCover), findsNothing);
    await app.close(tester);
    expect(app.guard!.isActive, isFalse);
  });

  testWidgets('аль хэдийн өгсөн шалгалт → дүнгийн хуудас (шалгалтын төрөл)', (tester) async {
    final http = FakeHttp()
      ..json(
        'GET',
        '/tests/t1',
        fakeMeta(type: 'EESH_MOCK', status: 'SUBMITTED', result: {'totalScore': 31, 'maxScore': 40}),
      )
      ..json('GET', '/exam-results/my/t1', {
        'test': {'id': 't1', 'title': 'ЭЕШ жишиг 3', 'type': 'EESH_MOCK'},
        'absent': false,
        'result': {'totalScore': 31, 'maxScore': 40, 'percent': 78},
        'parts': {'part1': 24, 'part1Max': 28, 'part2': 7, 'part2Max': 12},
        'review': {'level': 'FULL', 'opensAt': null, 'open': false, 'fullReview': false},
        'topics': [
          {'name': 'Интеграл', 'percent': 60, 'earned': 6, 'max': 10},
        ],
        'wrong': null,
        'practice': null,
      });
    final app = ExamTestApp(http);
    await app.pump(tester, location: '/app/tests/t1');
    await ExamTestApp.settle(tester, 10);
    expect(find.byType(ExamResultScreen), findsOneWidget);
    expect(find.text('31 / 40'), findsOneWidget);
    expect(find.text('78 хувь'), findsOneWidget);
    expect(find.text('Интеграл'), findsOneWidget);
    expect(find.text('Буруу бодлого, бодолт хараахан нээгдээгүй'), findsOneWidget);
    await app.close(tester);
  });

  testWidgets('жагсаалт: А/Б нэгтгэсэн, дуусаагүй шалгалтын тууз, шалгалт, өгсөн таб', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/tests', [
        {
          'id': 'a',
          'title': 'Логарифм 3',
          'type': 'DAILY',
          'groupKey': 'Логарифм 3',
          'variantLabel': 'A',
          '_count': {'problems': 10},
          'results': <Object?>[],
          'sessionStatus': null,
        },
        {
          'id': 'b',
          'title': 'Логарифм 3',
          'type': 'DAILY',
          'groupKey': 'Логарифм 3',
          'variantLabel': 'B',
          '_count': {'problems': 10},
          'results': <Object?>[],
          'sessionStatus': 'IN_PROGRESS',
        },
        {
          'id': 'c',
          'title': 'Илтгэгч 1',
          'type': 'DAILY',
          '_count': {'problems': 8},
          'results': [
            {'totalScore': 7, 'maxScore': 8},
          ],
          'sessionStatus': 'SUBMITTED',
        },
      ])
      ..json('GET', '/exam-results/my', {
        'exams': [
          {
            'id': 'e1',
            'title': '1000 бодлого · Сорил 10-A',
            'type': 'THOUSAND',
            'timeLimitMin': 90,
            '_count': {'problems': 40},
            'results': <Object?>[],
            'sessionStatus': null,
            'upcoming': false,
            'absent': false,
          },
          {
            'id': 'e2',
            'title': 'ЭЕШ жишиг 1',
            'type': 'EESH_MOCK',
            '_count': {'problems': 0},
            'results': <Object?>[],
            'upcoming': true,
            'assignedAt': '2026-11-05T01:00:00.000Z',
          },
        ],
      });
    final app = ExamTestApp(http);
    await app.pump(tester, location: '/app/tests');
    await tester.pumpAndSettle();
    expect(find.byType(TestsListScreen), findsOneWidget);
    expect(find.text('Дуусаагүй шалгалт байна'), findsOneWidget);
    // А/Б-аас эхэлсэн (B) нь л харагдана.
    expect(find.text('B хувилбар'), findsWidgets);
    expect(find.text('A хувилбар'), findsNothing);
    expect(find.text('Сорил 10-A'), findsOneWidget);
    expect(find.textContaining('Эхлэх: 2026.11.05 09:00'), findsOneWidget);
    // Номын код сурагчид харагдахгүй.
    expect(find.textContaining('200V3'), findsNothing);

    await tester.tap(find.text('Өгсөн, дүн'));
    await tester.pumpAndSettle();
    expect(find.textContaining('7/8'), findsOneWidget);
    await app.close(tester);
  });

  testWidgets('алдаа: эрхгүй тест — монгол мессеж, дахин оролдох', (tester) async {
    final http = FakeHttp()..error('GET', '/tests/t1', 403, 'Энэ тест таны ангийн хичээлд хамаарахгүй байна');
    final app = ExamTestApp(http);
    await app.pump(tester, location: '/app/tests/t1');
    expect(find.byType(ExamScreen), findsOneWidget);
    expect(find.text('Энэ тест таны ангийн хичээлд хамаарахгүй байна'), findsOneWidget);
    expect(find.text('Дахин оролдох'), findsOneWidget);
    await app.close(tester);
  });
}
