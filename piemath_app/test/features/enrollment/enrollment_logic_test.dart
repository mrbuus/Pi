import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/token_holder.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/network/api_client.dart';
import 'package:piemath_app/features/enrollment/application/enrollment_providers.dart';
import 'package:piemath_app/features/enrollment/data/enrollment_models.dart';
import 'package:piemath_app/features/enrollment/data/enrollment_repository.dart';
import 'package:piemath_app/features/enrollment/domain/window_draft.dart';
import 'package:piemath_app/features/enrollment/ui/enrollment_widgets.dart';

import '../../helpers/fake_http.dart';
import 'enrollment_fixtures.dart';

EnrollmentRepository _repo(FakeHttp http) =>
    EnrollmentRepository(ApiClient(baseUrl: 'https://api.test/api', tokens: TokenHolder(), dio: http.dio()));

const _math = EnrollmentWindow(
  subject: EnrollmentSubject.math,
  status: EnrollmentStatus.open,
  availability: SubjectAvailability.both,
  note: 'хуучин',
);

void main() {
  group('Эрх (вэб, сервертэй ижил)', () {
    test('Админ бүгд; Багш+ цуцлахгүй, эрх олгох нь finance.manage-тай бол', () {
      const admin = EnrollmentAccess(role: UserRole.admin);
      expect([admin.canManage, admin.canUnverify, admin.canGrantPass], [true, true, true]);
      const plus = EnrollmentAccess(role: UserRole.teacherPlus);
      expect([plus.canManage, plus.canUnverify, plus.canGrantPass], [true, false, false]);
      expect(const EnrollmentAccess(role: UserRole.teacherPlus, financeCapable: true).canGrantPass, isTrue);
      for (final r in [UserRole.teacher, UserRole.student, UserRole.parent, null]) {
        expect(EnrollmentAccess(role: r, financeCapable: true).canManage, isFalse);
        expect(EnrollmentAccess(role: r, financeCapable: true).canGrantPass, isFalse);
      }
    });
  });

  group('Загвар (JSON)', () {
    test('цонх: үл мэдэгдэх хичээлийг алгасна, үл мэдэгдэх төлөв → Дууссан', () async {
      final rows = await _repo(enrollmentHttp()).windows();
      expect(rows.map((w) => w.subject), [EnrollmentSubject.sat, EnrollmentSubject.math, EnrollmentSubject.socialStudies]);
      expect(orderedWindows(rows).map((w) => w.subject), EnrollmentSubject.values);
      expect(EnrollmentStatus.parse('X'), EnrollmentStatus.closed);
      expect(SubjectAvailability.parse(null), SubjectAvailability.both);
    });

    test('гадны багш: хүлээгдэж буй, татгалзсан, баталгаажсан', () async {
      final t = await _repo(enrollmentHttp()).externalTeachers();
      expect(t.pending.single.name, 'Ганаа Болд');
      expect(t.rejected.single.rejectionReason, 'Мэдээлэл дутуу');
      expect(t.verified.single.groupCount, 3);
      expect(t.of(ExternalTeacherState.verified).single.note, 'Шалгасан');
    });

    test('ангигүй сурагч, эрх (нэрээр эрэмбэлсэн)', () async {
      final repo = _repo(enrollmentHttp());
      final s = (await repo.unassignedStudents()).single;
      expect([s.name, s.grade, s.school], ['Тэмүүлэн Бат', 11, '1-р сургууль']);
      final passes = await repo.passes();
      expect(passes.map((p) => p.id), ['pass1', 'pass2']);
      expect(passes.first.price, isNull);
    });
  });

  group('Репозитор: бие', () {
    test('цонх засахад зөвхөн өөрчлөгдсөн талбар', () async {
      final http = enrollmentHttp();
      await _repo(http).updateWindow(EnrollmentSubject.math, status: EnrollmentStatus.closed);
      expect(requestJson(http, 'PATCH', '/enrollment-windows/MATH'), {'status': 'CLOSED'});
      await _repo(http).updateWindow(EnrollmentSubject.math, availability: SubjectAvailability.onlineOnly, note: '');
      expect(requestJson(http, 'PATCH', '/enrollment-windows/MATH'), {'availability': 'ONLINE_ONLY', 'note': ''});
    });

    test('баталгаажуулах: хоосон тэмдэглэл илгээхгүй; татгалзах шалтгааныг тайрна; эрх олгох', () async {
      final http = enrollmentHttp();
      final repo = _repo(http);
      await repo.verifyTeacher('x1', note: '  ');
      expect(requestJson(http, 'PUT', '/teacher-groups/verify/x1'), isEmpty);
      await repo.verifyTeacher('x1', note: ' сайн ');
      expect(requestJson(http, 'PUT', '/teacher-groups/verify/x1'), {'note': 'сайн'});
      await repo.rejectTeacher('x1', '  дутуу  ');
      expect(requestJson(http, 'PUT', '/teacher-groups/reject/x1'), {'reason': 'дутуу'});
      await repo.grantPass('pass1', 'p1');
      expect(requestJson(http, 'POST', '/passes/pass1/grant'), {'userId': 'p1'});
    });

    test('бичих хүсэлт сүлжээний алдаанд давтагдахгүй', () async {
      final http = FakeHttp()..on('POST', '/passes/pass1/grant', (_) => const FakeResponse.network());
      await expectLater(_repo(http).grantPass('pass1', 'p1'), throwsA(anything));
      expect(http.count('POST', '/passes/pass1/grant'), 1);
    });
  });

  group('Ноорог', () {
    test('өөрчлөлт, зөрүү, хаах баталгаажуулалт', () {
      final d = WindowDraft.of(_math);
      expect(d.isDirtyAgainst(_math), isFalse);
      final closed = d.copyWith(status: EnrollmentStatus.closed);
      expect(closed.isDirtyAgainst(_math), isTrue);
      expect(closed.diff(_math), (status: EnrollmentStatus.closed, availability: null, note: null));
      expect(closed.needsCloseConfirm(_math), isTrue);
      expect(d.copyWith(status: EnrollmentStatus.comingSoon).needsCloseConfirm(_math), isFalse);
      final savedClosed = WindowDraft.of(_math).copyWith(note: 'шинэ');
      expect(savedClosed.diff(_math).note, 'шинэ');
    });

    test('сервер дахин ачаалахад хадгалаагүй ноорогийг дарж бичихгүй', () {
      const sat = EnrollmentWindow(
        subject: EnrollmentSubject.sat,
        status: EnrollmentStatus.closed,
        availability: SubjectAvailability.both,
      );
      final dirty = WindowDraft.of(_math).copyWith(note: 'бичиж байна');
      final merged = mergeDrafts(
        {EnrollmentSubject.math: dirty, EnrollmentSubject.sat: WindowDraft.of(sat)},
        [_math, sat],
        [
          const EnrollmentWindow(
            subject: EnrollmentSubject.math,
            status: EnrollmentStatus.closed,
            availability: SubjectAvailability.both,
          ),
          const EnrollmentWindow(
            subject: EnrollmentSubject.sat,
            status: EnrollmentStatus.open,
            availability: SubjectAvailability.both,
          ),
        ],
      );
      expect(merged[EnrollmentSubject.math], dirty);
      expect(merged[EnrollmentSubject.sat]!.status, EnrollmentStatus.open);
    });

    test('зочны мөр, хүлээсэн өдөр', () {
      expect(visitorLine(EnrollmentStatus.closed, SubjectAvailability.both), 'Одоогоор шинэ элсэлт авахгүй байна');
      expect(visitorLine(EnrollmentStatus.open, SubjectAvailability.onlineOnly), 'Хамрах хэлбэр: Зөвхөн онлайн');
      expect(waitingDays(DateTime.utc(2026, 11, 7, 1), enrollmentNow), 3);
      expect(waitingDays(enrollmentNow.add(const Duration(days: 1)), enrollmentNow), 0);
    });

    test('утас, огноо (UB)', () {
      expect(spacedPhone('99001122'), '9900 1122');
      expect(spacedPhone('123'), '123');
      expect(spacedPhone(null), '');
      // 2026-11-07 17:00 UTC = 11-08 01:00 UB.
      expect(enrollmentDate('2026-11-07T17:00:00.000Z'), '2026 оны 11-р сарын 8');
      expect(enrollmentDate(null), '');
    });
  });
}
