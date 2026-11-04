import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/features/groups/data/groups_models.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/fonts.dart';
import '../student_harness.dart';
import '../w2_harness.dart';

// Зохиомол өгөгдөл (жинхэнэ сурагч, багшийн нэр биш).

const _groups = [
  {'id': 'g1', 'name': '12-2 анги', 'joinCode': 'ABC2345', 'memberCount': 2, 'createdAt': '2026-10-01T02:00:00.000Z'},
  {'id': 'g2', 'name': 'Оройн бүлэг', 'joinCode': 'XYZ7788', 'memberCount': 0, 'createdAt': '2026-10-05T02:00:00.000Z'},
];

Map<String, Object?> _details(String id) => {
  'id': id,
  'name': id == 'g1' ? '12-2 анги' : 'Шинэ бүлэг',
  'joinCode': id == 'g1' ? 'ABC2345' : 'NEW2345',
  'owner': {'id': 'u1', 'firstName': 'Сарнай', 'lastName': 'Бат'},
  'createdAt': '2026-10-01T02:00:00.000Z',
  'members': id != 'g1'
      ? <Object?>[]
      : [
          {
            'id': 'm1',
            'student': {'id': 's1', 'firstName': 'Анар', 'lastName': 'Тест'},
            'joinedAt': '2026-10-02T02:00:00.000Z',
            'testResults': [
              {
                'id': 'r1',
                'testId': 't1',
                'testTitle': 'Квадрат тэгшитгэл 1',
                'testType': 'PRACTICE',
                'totalScore': 18,
                'maxScore': 20,
                'percentage': 90,
                'createdAt': '2026-10-03T02:00:00.000Z',
              },
            ],
          },
          {
            'id': 'm2',
            'student': {'id': 's2', 'firstName': 'Номин', 'lastName': 'Тест'},
            'joinedAt': '2026-10-04T02:00:00.000Z',
            'testResults': <Object?>[],
          },
        ],
};

FakeHttp _http() => FakeHttp()
  ..json('GET', '/teacher-groups/my-groups', _groups)
  ..json('POST', '/teacher-groups/create', {
    'id': 'g3',
    'name': 'Шинэ бүлэг',
    'joinCode': 'NEW2345',
    'ownerId': 'u1',
    'createdAt': '2026-11-04T02:00:00.000Z',
  })
  ..json('GET', '/teacher-groups/g1', _details('g1'))
  ..json('GET', '/teacher-groups/g3', _details('g3'))
  ..json('PUT', '/teacher-groups/g1/archive', {'id': 'g1', 'archived': true})
  ..json('DELETE', '/teacher-groups/g1/students/s2', {'id': 'm2', 'leftAt': '2026-11-04T02:00:00.000Z'})
  ..json('POST', '/teacher-groups/join', {'id': 'm9', 'groupId': 'g1', 'studentId': 'u1'});

Map<String, Object?> _body(RequestOptions r) => (r.data as Map).cast<String, Object?>();

Future<void> _undoWindow(WidgetTester tester) async {
  await tester.pump(const Duration(seconds: 6));
  await settle(tester, frames: 20);
}

void main() {
  setUpAll(loadAppFonts);

  group('логик', () {
    test('нэгдэх код: цэвэрлэх, шалгах', () {
      expect(normalizeJoinCode(' abc 2345 '), 'ABC2345');
      expect(joinCodeError(''), 'Кодоо оруулна уу');
      expect(joinCodeError('ab12'), 'Код 6–8 тэмдэгттэй');
      expect(joinCodeError('abc-234'), 'Зөвхөн латин үсэг, тоо');
      expect(joinCodeError('abc2345'), isNull);
    });

    test('дүн, нэр', () {
      final d = GroupDetails.fromJson(_details('g1'));
      expect(d.ownerName, 'Б. Сарнай');
      expect(d.members.first.name, 'Т. Анар');
      expect(d.members.first.results.single.scoreText, '18/20, 90%');
      expect(const GroupResult(id: 'x', testTitle: 't', totalScore: 7.5, maxScore: 10).scoreText, '7.5/10');
    });
  });

  testWidgets('Гадны багш: жагсаалт, шинэ бүлэг үүсгээд дэлгэрэнгүй рүү', (tester) async {
    final http = _http();
    await pumpW2(tester, http: http, location: '/app/groups', role: UserRole.groupTeacher);
    expect(find.text('Анги удирдах'), findsOneWidget);
    expect(find.text('12-2 анги'), findsOneWidget);
    expect(find.text('ABC2345'), findsOneWidget);
    expect(find.text('2 бүлэг'), findsOneWidget);

    await tester.tap(find.byTooltip('Шинэ бүлэг'));
    await settle(tester);
    await tester.tap(find.text('Үүсгэх'));
    await settle(tester);
    expect(http.count('POST', '/teacher-groups/create'), 0, reason: 'нэргүй бол илгээхгүй');
    await tester.enterText(find.byType(TextField).last, 'Шинэ бүлэг');
    await tester.tap(find.text('Үүсгэх'));
    await settle(tester);
    expect(_body(http.requests.lastWhere((r) => r.path == '/teacher-groups/create')), {'name': 'Шинэ бүлэг'});
    expect(find.text('NEW2345'), findsOneWidget);
    expect(find.text('Бүлэгт сурагч алга'), findsOneWidget);
  });

  testWidgets('дэлгэрэнгүй: код хуулах, дүн, сурагч хасах «Буцаах»-тай', (tester) async {
    final http = _http();
    await pumpW2(tester, http: http, location: '/app/groups/g1', role: UserRole.teacher);
    expect(find.text('Багш Б. Сарнай'), findsOneWidget);
    expect(find.text('Сурагчид (2)'), findsOneWidget);
    expect(find.text('18/20, 90%'), findsOneWidget);

    Object? copied;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == 'Clipboard.setData') copied = (call.arguments as Map)['text'];
      return null;
    });
    addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));
    await tester.tap(find.byTooltip('Код хуулах'));
    await settle(tester);
    expect(copied, 'ABC2345');
    expect(find.text('Код хуулагдлаа'), findsOneWidget);

    // Хасаад буцаавал серверт явахгүй.
    final removeNomin = find.descendant(
      of: find.byKey(const ValueKey('member:s2')),
      matching: find.byTooltip('Бүлгээс хасах'),
    );
    await tester.tap(removeNomin);
    await settle(tester);
    await tester.tap(find.text('Хасах'));
    await settle(tester);
    expect(find.byKey(const ValueKey('member:s2')), findsNothing);
    await settle(tester, frames: 20);
    await tester.tap(find.text('Буцаах'));
    await settle(tester);
    await _undoWindow(tester);
    expect(find.byKey(const ValueKey('member:s2')), findsOneWidget);
    expect(http.count('DELETE', '/teacher-groups/g1/students/s2'), 0);

    await tester.tap(removeNomin);
    await settle(tester);
    await tester.tap(find.text('Хасах'));
    await settle(tester);
    await _undoWindow(tester);
    expect(http.count('DELETE', '/teacher-groups/g1/students/s2'), 1);
  });

  testWidgets('архивлах: дэлгэрэнгүйгээс баталж, жагсаалтаас «Буцаах»-ын дараа', (tester) async {
    final http = _http();
    await pumpW2(tester, http: http, location: '/app/groups', role: UserRole.teacherPlus);
    await tester.tap(find.text('12-2 анги'));
    await settle(tester);
    await tester.tap(find.text('Архивлах'));
    await settle(tester);
    // Баталгааны цонхны «Архивлах».
    await tester.tap(find.text('Архивлах').last);
    await settle(tester);
    expect(find.text('Оройн бүлэг'), findsOneWidget);
    expect(find.text('12-2 анги'), findsNothing);
    expect(http.count('PUT', '/teacher-groups/g1/archive'), 0);
    await _undoWindow(tester);
    expect(http.count('PUT', '/teacher-groups/g1/archive'), 1);
  });

  testWidgets('баталгаажаагүй гадны багш: серверийн мессеж', (tester) async {
    final http = FakeHttp()
      ..error('GET', '/teacher-groups/my-groups', 403, 'Идэвхтэй баталгаажсан гадны багш шаардлагатай');
    await pumpW2(tester, http: http, location: '/app/groups', role: UserRole.teacher);
    expect(find.text('Идэвхтэй баталгаажсан гадны багш шаардлагатай'), findsOneWidget);
  });

  testWidgets('Сурагч: кодоор нэгдэх, буруу код илгээхгүй', (tester) async {
    final http = _http();
    await pumpW2(tester, http: http, location: '/app/groups', role: UserRole.student);
    expect(find.text('Багшийн бүлэгт нэгдэх'), findsOneWidget);
    expect(http.count('GET', '/teacher-groups/my-groups'), 0);

    await tester.tap(find.text('Кодоор нэгдэх'));
    await settle(tester);
    await tester.enterText(find.byType(TextField).last, 'ab1');
    await tester.tap(find.text('Нэгдэх'));
    await settle(tester);
    expect(find.text('Код 6–8 тэмдэгттэй'), findsOneWidget);
    expect(http.count('POST', '/teacher-groups/join'), 0);

    await tester.enterText(find.byType(TextField).last, 'abc2345');
    await tester.tap(find.text('Нэгдэх'));
    await settle(tester);
    expect(_body(http.requests.lastWhere((r) => r.path == '/teacher-groups/join')), {'joinCode': 'ABC2345'});
    expect(find.text('Бүлэгт нэгдлээ, багш таны дүнг харна'), findsOneWidget);
  });

  testWidgets('Эцэг эх: энэ хэсэг хамаарахгүй', (tester) async {
    final http = _http();
    await pumpW2(tester, http: http, location: '/app/groups', role: UserRole.parent);
    expect(find.text('Энэ хэсэг гадны багш, сурагчид'), findsOneWidget);
    expect(http.requests, isEmpty);
  });
}
