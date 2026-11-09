import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/features/admin_oversight/data/oversight_data.dart';
import 'package:piemath_app/features/admin_oversight/ui/analytics_screen.dart';
import 'package:piemath_app/features/admin_oversight/ui/audit_screen.dart';
import 'package:piemath_app/features/admin_oversight/ui/deletion_requests_screen.dart';

import '../../helpers/fake_http.dart';
import 'staff_harness.dart';

void main() {
  testWidgets('аудит: жагсаалт, хүний нэр «+», өөрчлөлтийн дэлгэрэнгүй, үйлдлээр шүүх', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/users', [
        {'id': 'a1', 'firstName': 'Сараа', 'lastName': 'Бат', 'role': 'TEACHER_PLUS'},
        {'id': 's9', 'firstName': 'Хүүхэд', 'lastName': 'Нэг', 'role': 'STUDENT'},
      ])
      ..json('GET', '/audit', {
        'items': [
          {
            'id': 'l1',
            'actorId': 'a1',
            'actorRole': 'TEACHER_PLUS',
            'action': 'CONFIRM',
            'entity': 'Payment',
            'entityId': 'pay1',
            'before': {'status': 'PENDING', 'amount': 300000},
            'after': {'status': 'CONFIRMED', 'amount': 300000},
            'reason': 'Хуулгаар тулгасан',
            'at': '2026-11-09T02:00:00.000Z',
          },
        ],
        'total': 1,
        'page': 1,
        'pageSize': 30,
      });
    await pumpStaff(tester, const AuditScreen(), http: http, role: 'TEACHER_PLUS');
    expect(find.text('Payment, Баталсан'), findsOneWidget);
    expect(find.text('Б. Сараа+'), findsOneWidget);
    expect(find.text('Мөнгө'), findsOneWidget);
    await tester.tap(find.text('Payment, Баталсан'));
    await settle(tester);
    expect(find.text('Төлөв'), findsOneWidget);
    expect(find.text('Дараа: CONFIRMED'), findsOneWidget);
    expect(find.text('Дүн'), findsNothing); // өөрчлөгдөөгүй талбар харагдахгүй
    await tester.tapAt(const Offset(10, 10));
    await settle(tester, frames: 20);

    await tester.ensureVisible(find.byKey(const ValueKey('filter:REJECT'), skipOffstage: false));
    await settle(tester);
    await tester.tap(find.byKey(const ValueKey('filter:REJECT')));
    await settle(tester);
    final q = http.requests.lastWhere((r) => r.path == '/audit').queryParameters;
    expect(q['action'], 'REJECT');
  });

  testWidgets('аудит: Багш эрхгүй', (tester) async {
    await pumpStaff(tester, const AuditScreen(), http: FakeHttp(), role: 'TEACHER');
    expect(find.text('Энэ хэсгийг харах эрх танд алга.'), findsOneWidget);
  });

  testWidgets('устгах хүсэлт: зөвшөөрөхөд зөвхөн төлөв PATCH', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/admin/deletion-requests', [
        {
          'id': 'd1',
          'status': 'PENDING',
          'reason': 'Апп ашиглахаа больсон',
          'createdAt': '2026-11-08T02:00:00.000Z',
          'user': {'id': 'u9', 'firstName': 'Болд', 'lastName': 'Дорж', 'phone': '99887766', 'role': 'PARENT'},
        },
      ])
      ..json('PATCH', '/admin/deletion-requests/d1', {'ok': true});
    await pumpStaff(tester, const DeletionRequestsScreen(), http: http);
    expect(find.text('Дорж Болд'), findsOneWidget);
    expect(find.text('Шинэ'), findsOneWidget);
    await tester.tap(find.text('Дорж Болд'));
    await settle(tester);
    await tester.tap(find.text('Хүсэлтийг зөвшөөрөх'));
    await settle(tester);
    await tester.tap(find.widgetWithText(FilledButton, 'Хүсэлтийг зөвшөөрөх'));
    await settle(tester);
    expect(lastBody(http, 'PATCH', '/admin/deletion-requests/d1'), {'status': 'RESOLVED'});
  });

  testWidgets('аналитик: тоо, анхаарах сурагч, хугацаа солих', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/analytics/overview', {
        'dau': 12,
        'wau': 40,
        'mau': 85,
        'avgSessionMs': 600000,
        'totalActiveStudents': 85,
        'totalProblemsAttempted': 1500,
        'lowConfidence': false,
      })
      ..json('GET', '/analytics/classrooms', {
        'classrooms': [
          {'classroomName': '12А', 'enrolled': 20, 'active': 15, 'participationRate': 0.75, 'avgProblemsPerActiveStudent': 8.2},
        ],
      })
      ..json('GET', '/analytics/topics', {'topics': <Object>[]})
      ..json('GET', '/analytics/at-risk', {
        'students': [
          {
            'studentId': 's1',
            'name': 'Тэмүүлэн',
            'classroomName': '12А',
            'lastActiveAt': null,
            'reasons': ['INACTIVE'],
          },
        ],
      });
    await pumpStaff(
      tester,
      const AnalyticsScreen(),
      http: http,
      overrides: [oversightTodayProvider.overrideWithValue(UbDateTime(2026, 11, 10, 9))],
    );
    expect(find.text('12'), findsOneWidget);
    expect(find.text('1500'), findsOneWidget);
    expect(find.text('Тэмүүлэн'), findsOneWidget);
    expect(find.text('Идэвхгүй'), findsOneWidget);
    expect(http.requests.firstWhere((r) => r.path == '/analytics/overview').queryParameters, {
      'from': '2026-10-12',
      'to': '2026-11-10',
    });
    await tester.ensureVisible(find.text('Ангиуд'));
    await settle(tester);
    await tester.tap(find.text('Ангиуд'));
    await settle(tester);
    expect(find.text('75%'), findsOneWidget);
    await tester.ensureVisible(find.text('7 хоног'));
    await settle(tester);
    await tester.tap(find.text('7 хоног'));
    await settle(tester);
    expect(http.requests.lastWhere((r) => r.path == '/analytics/overview').queryParameters['from'], '2026-11-04');
  });
}
