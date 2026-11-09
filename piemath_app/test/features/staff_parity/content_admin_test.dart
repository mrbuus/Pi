import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/features/content_admin/application/content_providers.dart';
import 'package:piemath_app/features/content_admin/data/content_models.dart';
import 'package:piemath_app/features/content_admin/ui/login_text_screen.dart';
import 'package:piemath_app/features/content_admin/ui/placement_admin_screen.dart';
import 'package:piemath_app/features/content_admin/ui/placement_detail_screen.dart';
import 'package:piemath_app/features/content_admin/ui/sorils_admin_screen.dart';
import 'package:piemath_app/features/content_admin/ui/theory_admin_screen.dart';

import '../../helpers/fake_http.dart';
import 'staff_harness.dart';

FakeHttp _theoryHttp() => FakeHttp()
  ..json('GET', '/books', [
    {'id': 'b1', 'title': 'Алгебр · 1', 'code': 'A1', 'subject': 'MATH'},
  ])
  ..json('GET', '/chapters', [
    {
      'id': 'ch1',
      'title': 'Квадрат тэгшитгэл',
      'freePreview': false,
      '_count': {'theories': 2},
    },
  ])
  ..json('GET', '/lessons/ch1', {
    'theories': [
      {'id': 't2', 'title': 'Виетийн теорем', 'content': r'$x_1+x_2=-b$', 'order': 2, 'createdById': 'other'},
      {'id': 't1', 'title': 'Дискриминант', 'content': r'$D=b^2-4ac$', 'order': 1, 'createdById': 'u1'},
    ],
  });

void main() {
  group('Онолын агуулга', () {
    testWidgets('ном, бүлэг сонгогдож блокууд дарааллаар гарна; архивлах нь зөөлөн', (tester) async {
      final http = _theoryHttp()..json('DELETE', '/lessons/theory/t1', {'ok': true});
      await pumpStaff(tester, const TheoryAdminScreen(), http: http, role: 'TEACHER_PLUS');
      expect(find.text('Алгебр — 1'), findsOneWidget);
      expect(find.text('Квадрат тэгшитгэл'), findsOneWidget);
      final first = tester.getTopLeft(find.byKey(const ValueKey('theory:t1')));
      final second = tester.getTopLeft(find.byKey(const ValueKey('theory:t2')));
      expect(first.dy < second.dy, isTrue);

      await tester.tap(find.byTooltip('Архивлах').first);
      await settle(tester);
      await tester.tap(find.widgetWithText(FilledButton, 'Архивлах'));
      await settle(tester);
      expect(find.byKey(const ValueKey('theory:t1')), findsNothing);
      expect(http.count('DELETE', '/lessons/theory/t1'), 0);
      await tester.pump(const Duration(seconds: 6));
      await settle(tester, frames: 20);
      expect(http.count('DELETE', '/lessons/theory/t1'), 1);
    });

    testWidgets('Багшид архивлах товч байхгүй, дараалал солиход PATCH reorder', (tester) async {
      final http = _theoryHttp()..json('PATCH', '/lessons/ch1/theory/reorder', {'ok': true});
      await pumpStaff(tester, const TheoryAdminScreen(), http: http, role: 'TEACHER');
      expect(find.byTooltip('Архивлах'), findsNothing);
      await tester.tap(find.byTooltip('Доош').first);
      await settle(tester);
      expect(lastBody(http, 'PATCH', '/lessons/ch1/theory/reorder')['ids'], ['t2', 't1']);
    });

    testWidgets('шинэ блок: гарчиг, агуулга, clientRequestId-тэй POST', (tester) async {
      final http = _theoryHttp()..json('POST', '/lessons/ch1/theory', {'id': 't3'});
      await pumpStaff(tester, const TheoryAdminScreen(), http: http, role: 'TEACHER');
      await tester.tap(find.text('Блок нэмэх'));
      await settle(tester);
      await tester.tap(find.text('Хадгалах'));
      await settle(tester);
      expect(find.text('Гарчиг оруулна уу'), findsOneWidget);
      await tester.enterText(find.widgetWithText(TextField, 'Гарчиг'), 'Шинэ сэдэв');
      await tester.enterText(find.widgetWithText(TextField, 'Агуулга'), r'Томьёо $a+b$');
      await tester.tap(find.text('Хадгалах'));
      await settle(tester);
      final body = lastBody(http, 'POST', '/lessons/ch1/theory');
      expect(body['title'], 'Шинэ сэдэв');
      expect(body['content'], r'Томьёо $a+b$');
      expect((body['clientRequestId']! as String).length, 36);
      expect(find.text('Хадгалагдлаа'), findsOneWidget);
    });

    test('зургийн markdown нэмэх, хасах', () {
      final c = insertImageMarkdown('Текст', 'Зураг [1]', 'k1.jpg');
      expect(c, 'Текст\n\n![Зураг (1)](k1.jpg)\n');
      expect(removeImageMarkdown(c, 'k1.jpg').trim(), 'Текст');
      expect(splitTheory(c).map((p) => p.imageKey).toList(), [null, 'k1.jpg']);
    });
  });

  group('Жишиг сорил', () {
    FakeHttp mockHttp() => FakeHttp()
      ..json('GET', '/mock-exams/admin', [
        {
          'id': 'm1',
          'title': 'Долоо хоногийн сорил',
          'startsAt': '2026-11-15T03:00:00.000Z',
          'published': false,
          'timeLimitMin': 90,
          'problemCount': 30,
          'registered': 4,
          'results': 0,
          'phase': 'upcoming',
          'test': {'id': 'x1', 'title': 'ЭЕШ сорил 3', 'type': 'EESH_MOCK'},
        },
      ])
      ..json('GET', '/mock-exams/m1/registrations', [
        {
          'id': 'r1',
          'firstName': 'Тэмүүлэн',
          'lastName': 'Бат',
          'phone': '99112233',
          'status': 'SUBMITTED',
          'score': 21,
          'max': 30,
          'studentProfile': {'school': '1-р сургууль', 'grade': 12},
        },
      ]);

    testWidgets('жагсаалт, нийтлэх, бүртгэл; устгах товч байхгүй', (tester) async {
      final http = mockHttp()..json('PATCH', '/mock-exams/m1', {'ok': true});
      await pumpStaff(tester, const SorilsAdminScreen(), http: http);
      expect(find.text('Долоо хоногийн сорил'), findsOneWidget);
      expect(find.text('Нийтлээгүй'), findsOneWidget);
      expect(find.text('4 бүртгэл'), findsOneWidget);
      expect(find.byTooltip('Устгах'), findsNothing);
      await tester.tap(find.byTooltip('Нийтлэх'));
      await settle(tester);
      expect(lastBody(http, 'PATCH', '/mock-exams/m1'), {'published': true});

      await tester.tap(find.text('Долоо хоногийн сорил'));
      await settle(tester, frames: 20);
      expect(find.text('Б. Тэмүүлэн'), findsOneWidget);
      expect(find.text('21/30'), findsOneWidget);
    });

    testWidgets('Багш зөвхөн харна', (tester) async {
      await pumpStaff(tester, const SorilsAdminScreen(), http: mockHttp(), role: 'TEACHER');
      expect(find.text('Шинэ сорил'), findsNothing);
      expect(find.byTooltip('Нийтлэх'), findsNothing);
    });

    testWidgets('шинэ сорил: дараагийн Ням 11:00 UB-ээр илгээнэ', (tester) async {
      final http = mockHttp()
        ..json('GET', '/mock-exams/tests', [
          {'id': 'x1', 'title': 'ЭЕШ сорил 3', 'timeLimitMin': 90, 'problemCount': 30},
        ])
        ..json('POST', '/mock-exams', {'id': 'm2'});
      await pumpStaff(
        tester,
        const SorilsAdminScreen(),
        http: http,
        overrides: [contentNowProvider.overrideWithValue(UbDateTime(2026, 11, 10, 9))],
      );
      await tester.tap(find.text('Шинэ сорил'));
      await settle(tester, frames: 20);
      await tester.ensureVisible(find.text('Тест'));
      await tester.tap(find.text('Тест'));
      await settle(tester);
      await tester.tap(find.text('ЭЕШ сорил 3').last);
      await settle(tester);
      await tester.tap(find.text('Нэмэх'));
      await settle(tester, frames: 20);
      final body = lastBody(http, 'POST', '/mock-exams');
      expect(body['testId'], 'x1');
      // 2026-11-15 (Ням) 11:00 UB = 03:00 UTC
      expect(body['startsAt'], '2026-11-15T03:00:00.000Z');
      expect(body['lateMin'], 30);
    });
  });

  group('Түвшин тогтоох', () {
    final attempts = [
      {
        'id': 'p1',
        'name': 'Номин',
        'phone': '88001122',
        'grade': 9,
        'school': '5-р сургууль',
        'autoScore': 6,
        'maxScore': 10,
        'photoCount': 3,
        'submittedAt': '2026-11-09T05:30:00.000Z',
        'startedAt': '2026-11-09T05:00:00.000Z',
        'createdAt': '2026-11-09T05:00:00.000Z',
        'status': 'NEW',
      },
      {
        'id': 'p2',
        'name': 'Ганзориг',
        'phone': '88003344',
        'grade': 10,
        'photoCount': 0,
        'status': 'CONTACTED',
        'createdAt': '2026-11-08T05:00:00.000Z',
      },
    ];

    testWidgets('жагсаалт: төлөвөөр шүүх, дэлгэрэнгүй рүү', (tester) async {
      final http = FakeHttp()..json('GET', '/placement', attempts);
      await pumpStaff(tester, const PlacementAdminScreen(), http: http, role: 'TEACHER');
      expect(find.text('Номин'), findsOneWidget);
      expect(find.text('Ганзориг'), findsOneWidget);
      expect(find.text('Хариу 6/10'), findsOneWidget);
      await tester.ensureVisible(find.byKey(const ValueKey('filter:CONTACTED')));
      await settle(tester);
      await tester.tap(find.byKey(const ValueKey('filter:CONTACTED')));
      await settle(tester);
      expect(find.text('Номин'), findsNothing);
      await tester.tap(find.text('Ганзориг'));
      await settle(tester);
      expect(find.text('ROUTE:/app/admin/placement/p2'), findsOneWidget);
    });

    testWidgets('дэлгэрэнгүй: хариу, зураггүй анхааруулга, дүгнэлт хадгалах', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/placement/p1', {
          ...attempts.first,
          'title': 'Түвшин тогтоох шалгалт',
          'minutes': 40,
          'teacherNote': null,
          'problems': [
            {
              'n': 1,
              'statement': r'$2+3$',
              'kind': 'choice',
              'points': 1,
              'choices': {'A': '4', 'B': '5'},
              'answer': 'B',
              'given': 'A',
              'correct': false,
              'photos': <String>[],
            },
          ],
        })
        ..json('PATCH', '/placement/p1', {'ok': true});
      await pumpStaff(tester, const PlacementDetailScreen(id: 'p1'), http: http, role: 'TEACHER');
      expect(find.text('Номин'), findsOneWidget);
      expect(find.text('Буруу'), findsOneWidget);
      expect(find.text('30 мин / 40 мин'), findsOneWidget);
      expect(find.text('Бодолтын зураг алга, чадаагүй гэж үзнэ'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Дунд'), 200, scrollable: find.byType(Scrollable).first);
      await tester.tap(find.text('Дунд'));
      await settle(tester);
      await tester.scrollUntilVisible(find.text('Хадгалах'), 200, scrollable: find.byType(Scrollable).first);
      await tester.tap(find.text('Хадгалах'));
      await settle(tester);
      expect(lastBody(http, 'PATCH', '/placement/p1'), {'status': 'REVIEWED', 'level': 'Дунд', 'teacherNote': ''});
    });

    testWidgets('агуулга: Багш зөвхөн харна, Багш+ засаад PUT', (tester) async {
      final config = {
        'title': 'Түвшин тогтоох шалгалт',
        'minutes': 40,
        'instructions': 'Тайван бодоорой',
        'problems': [
          {
            'n': 1,
            'statement': r'$2+3$',
            'kind': 'choice',
            'points': 1,
            'choices': {'A': '4', 'B': '5', 'C': '6', 'D': '7', 'E': '8'},
            'answer': 'B',
          },
          {
            'n': 2,
            'statement': r'$x^2=9$, эерэг шийд',
            'kind': 'boxes',
            'points': 2,
            'boxes': [
              {'key': 'a', 'digits': 1},
            ],
            'answer': {'a': '3'},
          },
        ],
      };
      final http = FakeHttp()
        ..json('GET', '/placement', attempts)
        ..json('GET', '/placement/config', config)
        ..json('PUT', '/placement/config', {'ok': true});
      await pumpStaff(tester, const PlacementAdminScreen(), http: http, role: 'TEACHER_PLUS');
      await tester.tap(find.text('Агуулга'));
      await settle(tester, frames: 20);
      expect(find.text('Зөв хариу: B'), findsOneWidget);
      expect(find.text('Зөв хариу: [a]=3'), findsOneWidget);
      await tester.tap(find.byTooltip('Доош').first);
      await settle(tester);
      await tester.tap(find.text('Хадгалах'));
      await settle(tester);
      final body = lastBody(http, 'PUT', '/placement/config');
      final problems = body['problems']! as List;
      expect((problems.first as Map)['kind'], 'boxes');
      expect((problems.first as Map)['answer'], {'a': '3'});
      expect((problems.last as Map)['answer'], 'B');
    });
  });

  group('Нэвтрэх хуудасны бичиг', () {
    testWidgets('Админ засаад хадгална', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/auth/login-text', {'body': 'Хуучин'})
        ..json('PUT', '/auth/login-text', {'body': 'Шинэ зарлал'});
      await pumpStaff(tester, const LoginTextScreen(), http: http);
      expect(find.text('Хадгалсан'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'Шинэ зарлал');
      await settle(tester);
      await tester.tap(find.text('Хадгалах'));
      await settle(tester);
      expect(lastBody(http, 'PUT', '/auth/login-text'), {'body': 'Шинэ зарлал'});
      expect(find.text('Хадгалсан'), findsOneWidget);
    });

    testWidgets('Багш+ эрхгүй', (tester) async {
      await pumpStaff(tester, const LoginTextScreen(), http: FakeHttp(), role: 'TEACHER_PLUS');
      expect(find.text('Энэ хэсгийг харах эрх танд алга.'), findsOneWidget);
    });
  });
}
