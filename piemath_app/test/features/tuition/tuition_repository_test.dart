import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/features/tuition/data/tuition_models.dart';
import 'package:piemath_app/features/tuition/data/tuition_repository.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import 'tuition_fixtures.dart';

void main() {
  TuitionRepository repo(FakeHttp h) => testContainer(http: h).read(tuitionRepositoryProvider);

  group('санхүүгийн эрх', () {
    test('бүх ангид finance.manage бол эрхтэй', () async {
      final h = FakeHttp()..json('GET', '/staff-capabilities/me', capsWithFinance);
      expect(await repo(h).hasFinanceCapability(), isTrue);
    });

    test('өөр эрх, эсвэл нэг ангид хязгаарласан finance.manage бол эрхгүй', () async {
      final h = FakeHttp()
        ..json('GET', '/staff-capabilities/me', capsWithoutFinance)
        ..json('GET', '/staff-capabilities/me', {
          'administrator': false,
          'grants': [
            {'capability': 'finance.manage', 'scopeKey': 'c1'},
          ],
        });
      final r = repo(h);
      expect(await r.hasFinanceCapability(), isFalse);
      expect(await r.hasFinanceCapability(), isFalse);
    });

    test('administrator бол эрхтэй', () async {
      final h = FakeHttp()..json('GET', '/staff-capabilities/me', {'administrator': true, 'grants': <Object>[]});
      expect(await repo(h).hasFinanceCapability(), isTrue);
    });
  });

  test('тооцоо: query, серверийн утга, тайлбарын мөр өөрчлөгдөхгүй', () async {
    final h = FakeHttp()..json('GET', '/tuition/refund/preview', previewJson(warnings: ['ZERO_TUITION']));
    final p = await repo(h).preview(studentId: 's1', classroomId: 'c1', leftOn: '2026-11-03');
    final q = h.requests.single.queryParameters;
    expect(q, {'studentId': 's1', 'classroomId': 'c1', 'leftOn': '2026-11-03'});
    expect(p.calculation.refundAmount, 328125);
    expect(p.calculation.dailyRate, 21875);
    expect(p.calculation.owed, 721875);
    expect(p.calculation.warnings, ['ZERO_TUITION']);
    expect(p.explanation, previewExplanation);
    expect(p.plan!.label, 'Сар бүр');
    expect(p.joinedOn, '2026-09-01');
  });

  test('багцын шошго: төлбөрөөр болон гараар бүтэн жил', () {
    expect(RefundPlan.fromJson({'kind': 'FULL_YEAR', 'autoFull': true})!.label, 'Бүтэн жил (төлбөрөөр)');
    expect(RefundPlan.fromJson({'kind': 'FULL_YEAR', 'settled': true})!.label, 'Бүтэн жил (гараар)');
    expect(RefundPlan.fromJson(null), isNull);
  });

  test('жагсаалт: төлөв, хуудаслалт; жагсаалтын warnings мөр нь хоосон', () async {
    final h = FakeHttp()
      ..json('GET', '/tuition/refunds', {
        'refunds': [refundJson(warnings: '["ZERO_TUITION"]')],
        'total': 41,
      });
    final page = await repo(h).list(status: RefundStatus.paid, offset: 20);
    final q = h.requests.single.queryParameters;
    expect(q['status'], 'PAID');
    expect(q['offset'], '20');
    expect(q['limit'], '20');
    expect(page.total, 41);
    final r = page.refunds.single;
    expect(r.status, RefundStatus.draft);
    expect(r.leftOnKey, '2026-11-03');
    expect(r.student.fullName, 'Тестийн Болд');
    expect(r.calculation.warnings, isEmpty);
  });

  test('дэлгэрэнгүй: ажилтан, анхааруулга', () async {
    final h = FakeHttp()
      ..json(
        'GET',
        '/tuition/refund/r1',
        refundJson(detail: true, warnings: ['NO_LESSON_DAYS'], status: 'PAID', paymentMethod: 'CASH'),
      );
    final r = await repo(h).get('r1');
    expect(r.status, RefundStatus.paid);
    expect(r.createdBy!.role, 'TEACHER_PLUS');
    expect(r.calculation.warnings, ['NO_LESSON_DAYS']);
    expect(r.paymentMethod, 'CASH');
  });

  group('ноорог үүсгэх (idempotent)', () {
    test('амжилттай: бие, нэг л хүсэлт', () async {
      final h = FakeHttp()..json('POST', '/tuition/refund', {'id': 'r1'});
      final c = await repo(h).create(studentId: 's1', classroomId: 'c1', leftOn: '2026-11-03');
      expect(c.id, 'r1');
      expect(c.existed, isFalse);
      expect(h.requests.single.data, {'studentId': 's1', 'classroomId': 'c1', 'leftOn': '2026-11-03'});
    });

    test('сервер давхардлыг татгалзвал одоо байгаа нооргийг буцаана', () async {
      final h = FakeHttp()
        ..error('POST', '/tuition/refund', 400, 'Энэ сурагч болон ангийн буцаалтын бүртгэл аль хэдийн байна')
        ..json('GET', '/tuition/refunds', {
          'refunds': [refundJson(id: 'old', status: 'CANCELLED'), refundJson(id: 'r9')],
          'total': 2,
        });
      final c = await repo(h).create(studentId: 's1', classroomId: 'c1', leftOn: '2026-11-03');
      expect(c.id, 'r9');
      expect(c.existed, isTrue);
      expect(h.count('POST', '/tuition/refund'), 1);
      expect(queryOf(h, '/tuition/refunds', 'studentId'), 's1');
      expect(queryOf(h, '/tuition/refunds', 'classroomId'), 'c1');
    });

    test('хариу ирэхээс өмнө холболт тасарвал дахин илгээхгүй — бүртгэгдсэнийг олно', () async {
      final h = FakeHttp()
        ..on('POST', '/tuition/refund', (_) => const FakeResponse.network())
        ..json('GET', '/tuition/refunds', {
          'refunds': [refundJson(id: 'r5', status: 'PENDING_APPROVAL')],
          'total': 1,
        });
      final c = await repo(h).create(studentId: 's1', classroomId: 'c1', leftOn: '2026-11-03');
      expect(c.id, 'r5');
      expect(h.count('POST', '/tuition/refund'), 1);
    });

    test('холболт тасарсан, бүртгэл олдохгүй бол алдааг буцаана (өөр өдрийн ноорог тооцохгүй)', () async {
      final h = FakeHttp()
        ..on('POST', '/tuition/refund', (_) => const FakeResponse.network())
        ..json('GET', '/tuition/refunds', {
          'refunds': [
            {...refundJson(id: 'r7'), 'leftOn': '2026-10-01T00:00:00.000Z'},
          ],
          'total': 1,
        });
      await expectLater(
        repo(h).create(studentId: 's1', classroomId: 'c1', leftOn: '2026-11-03'),
        throwsA(isA<ApiError>().having((e) => e.isNetwork, 'network', isTrue)),
      );
      expect(h.count('POST', '/tuition/refund'), 1);
    });

    test('өөр шалтгаантай 400 (бүртгэлгүй) бол серверийн мессеж хэвээр', () async {
      final h = FakeHttp()
        ..error('POST', '/tuition/refund', 400, 'Сурагч энэ ангид сууж байгаа бүртгэл байхгүй')
        ..json('GET', '/tuition/refunds', {'refunds': <Object>[], 'total': 0});
      await expectLater(
        repo(h).create(studentId: 's1', classroomId: 'c1', leftOn: '2026-11-03'),
        throwsA(isA<ApiError>().having((e) => e.message, 'message', 'Сурагч энэ ангид сууж байгаа бүртгэл байхгүй')),
      );
    });

    test('эрхгүй (403) бол давхардал хайхгүй', () async {
      final h = FakeHttp()..error('POST', '/tuition/refund', 403, 'Энэ үйлдлийн тусгай эрх олгогдоогүй');
      await expectLater(
        repo(h).create(studentId: 's1', classroomId: 'c1', leftOn: '2026-11-03'),
        throwsA(isA<ApiError>()),
      );
      expect(h.count('GET', '/tuition/refunds'), 0);
    });
  });

  test('төлөв солих замууд ба бие', () async {
    final h = FakeHttp()
      ..json('POST', '/tuition/refund/r1/pending', {'id': 'r1'})
      ..json('POST', '/tuition/refund/r1/approve', {'id': 'r1'})
      ..json('POST', '/tuition/refund/r1/paid', {'id': 'r1'})
      ..json('POST', '/tuition/refund/r1/cancel', {'id': 'r1'});
    final r = repo(h);
    await r.submitForApproval('r1');
    await r.approve('r1');
    await r.markPaid('r1', 'CASH');
    await r.cancel('r1', '  Буруу огноо ');
    expect(h.requests.map((q) => q.path), [
      '/tuition/refund/r1/pending',
      '/tuition/refund/r1/approve',
      '/tuition/refund/r1/paid',
      '/tuition/refund/r1/cancel',
    ]);
    expect(h.requests[2].data, {'paymentMethod': 'CASH'});
    expect(h.requests[3].data, {'cancelReason': 'Буруу огноо'});
  });
}
