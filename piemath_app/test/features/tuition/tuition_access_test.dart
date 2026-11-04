import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/tuition/ui/refund_detail_screen.dart';
import 'package:piemath_app/features/tuition/ui/refund_list_screen.dart';
import 'package:piemath_app/features/tuition/ui/refund_start_screen.dart';

import '../../helpers/fake_http.dart';
import 'tuition_fixtures.dart';

const _denied = 'Энэ хэсэг танд нээгдээгүй';

/// Буцаалтын ямар нэг API дуудагдсан эсэх.
bool _touchedTuition(FakeHttp h) => h.requests.any((r) => r.path.startsWith('/tuition') || r.path.startsWith('/users'));

void main() {
  group('эрх (вэб: ADMIN, TEACHER_PLUS; сервер: finance.manage)', () {
    for (final role in ['TEACHER', 'STUDENT', 'PARENT', 'GROUP_TEACHER']) {
      testWidgets('$role: гурван дэлгэц бүгд хаалттай, ямар ч хүсэлтгүй', (tester) async {
        for (final screen in const [RefundStartScreen(), RefundListScreen(), RefundDetailScreen(refundId: 'r1')]) {
          final h = FakeHttp();
          await pumpTuition(tester, screen, http: h, role: role);
          expect(find.text(_denied), findsOneWidget, reason: '$role ${screen.runtimeType}');
          expect(find.textContaining('₮'), findsNothing);
          expect(h.requests, isEmpty, reason: '$role ${screen.runtimeType}');
        }
      });
    }

    testWidgets('Админ: эрхийн хүсэлтгүйгээр нээгдэнэ', (tester) async {
      final h = FakeHttp();
      await pumpTuition(tester, const RefundStartScreen(), http: h, role: 'ADMIN');
      expect(find.byKey(const Key('refund-search')), findsOneWidget);
      expect(h.count('GET', '/staff-capabilities/me'), 0);
    });

    testWidgets('Багш+ finance.manage-тэй: нээгдэнэ', (tester) async {
      final h = FakeHttp()..json('GET', '/staff-capabilities/me', capsWithFinance);
      await pumpTuition(tester, const RefundStartScreen(), http: h, role: 'TEACHER_PLUS');
      expect(find.byKey(const Key('refund-search')), findsOneWidget);
      expect(find.text(_denied), findsNothing);
    });

    testWidgets('Багш+ finance.manage-гүй: хаалттай, буцаалтын API дуудахгүй', (tester) async {
      final h = FakeHttp()
        ..json('GET', '/staff-capabilities/me', capsWithoutFinance)
        ..json('GET', '/tuition/refunds', {
          'refunds': [refundJson()],
          'total': 1,
        });
      await pumpTuition(tester, const RefundListScreen(), http: h, role: 'TEACHER_PLUS');
      expect(find.text(_denied), findsOneWidget);
      expect(find.textContaining('₮'), findsNothing);
      expect(_touchedTuition(h), isFalse);
    });

    testWidgets('Багш+ эрхийн хүсэлт 403: хаалттай', (tester) async {
      final h = FakeHttp()..error('GET', '/staff-capabilities/me', 403, 'Идэвхтэй ажилтны эрх шаардлагатай.');
      await pumpTuition(
        tester,
        const RefundDetailScreen(refundId: 'r1'),
        http: h,
        role: 'TEACHER_PLUS',
      );
      expect(find.text(_denied), findsOneWidget);
      expect(_touchedTuition(h), isFalse);
    });

    testWidgets('эрх шалгах үед сүлжээний алдаа: «Дахин оролдох»', (tester) async {
      final h = FakeHttp()
        ..on('GET', '/staff-capabilities/me', (_) => const FakeResponse(<String, Object?>{}, status: 500))
        ..json('GET', '/staff-capabilities/me', capsWithFinance);
      await pumpTuition(tester, const RefundStartScreen(), http: h, role: 'TEACHER_PLUS');
      expect(find.text('Дахин оролдох'), findsOneWidget);
      await tester.tap(find.text('Дахин оролдох'));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('refund-search')), findsOneWidget);
    });

    testWidgets('сервер 403 буцаавал (эрх цуцлагдсан) дэлгэрэнгүй хаалттай', (tester) async {
      final h = FakeHttp()
        ..json('GET', '/staff-capabilities/me', capsWithFinance)
        ..error('GET', '/tuition/refund/r1', 403, 'Энэ үйлдлийн тусгай эрх олгогдоогүй эсвэл хугацаа нь дууссан.');
      await pumpTuition(
        tester,
        const RefundDetailScreen(refundId: 'r1'),
        http: h,
        role: 'TEACHER_PLUS',
      );
      expect(find.text(_denied), findsOneWidget);
    });
  });

  group('дэлгэрэнгүйн үйлдэл (вэбийн RefundDetail-тэй ижил)', () {
    Future<void> pumpDetail(WidgetTester tester, String role, String status) async {
      final h = FakeHttp()
        ..json('GET', '/staff-capabilities/me', capsWithFinance)
        ..json('GET', '/tuition/refund/r1', refundJson(status: status, detail: true));
      await pumpTuition(
        tester,
        const RefundDetailScreen(refundId: 'r1'),
        http: h,
        role: role,
      );
    }

    final cases = <(String, String, List<String>)>[
      ('ADMIN', 'DRAFT', ['Зөвшөөрөлд илгээх', 'Зөвшөөрөх', 'Цуцлах']),
      ('TEACHER_PLUS', 'DRAFT', ['Зөвшөөрөлд илгээх', 'Цуцлах']),
      ('ADMIN', 'PENDING_APPROVAL', ['Зөвшөөрөх', 'Цуцлах']),
      ('TEACHER_PLUS', 'PENDING_APPROVAL', ['Цуцлах']),
      ('ADMIN', 'APPROVED', ['Олгосон гэж тэмдэглэх', 'Цуцлах']),
      ('TEACHER_PLUS', 'APPROVED', ['Цуцлах']),
      ('ADMIN', 'PAID', []),
      ('ADMIN', 'CANCELLED', []),
    ];
    const all = ['Зөвшөөрөлд илгээх', 'Зөвшөөрөх', 'Олгосон гэж тэмдэглэх', 'Цуцлах'];
    for (final (role, status, shown) in cases) {
      testWidgets('$role $status: ${shown.isEmpty ? 'үйлдэлгүй' : shown.join(', ')}', (tester) async {
        await pumpDetail(tester, role, status);
        for (final label in all) {
          expect(
            buttonWith(label),
            shown.contains(label) ? findsOneWidget : findsNothing,
            reason: '$role $status $label',
          );
        }
      });
    }
  });
}
