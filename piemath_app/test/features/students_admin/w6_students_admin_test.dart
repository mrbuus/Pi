import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/students_admin/data/students_admin_models.dart';
import 'package:piemath_app/features/students_admin/domain/student_filters.dart';
import 'package:piemath_app/features/students_admin/ui/student_actions.dart';
import 'package:piemath_app/features/students_admin/ui/withdrawal_sheet.dart';
import 'package:piemath_app/features/teacher/ui/student_screen.dart';

import '../../helpers/fake_http.dart';
import '../teacher/teacher_harness.dart';
import 'students_admin_fixtures.dart';

// Давалгаа 6 (вэб 2026-11-08…11-12): эцэг эхийн утсаар хайх, хоёр ангид зэрэг суух (математик + Нийгэм),
// «Сургалтаас хасах»-ын вэбээс өмнөх хичээл, өмнөх буцаалт, хуваарьгүй анги.

AdminStudent _s(Map<String, Object?> extra) =>
    AdminStudent.fromJson({...studentJson('s9', first: 'Номин', last: 'Тест', phone: '99112233'), ...extra});

void main() {
  group('хайлт (вэбийн StudentsDirectory)', () {
    test('аав, ээж, аппын эцэг эхийн утас; зай, +976-тай бичсэн ч олно', () {
      final s = AdminStudent.fromJson({
        ...studentJson('s9', phone: '99112233'),
        'username': 'nomin9',
        'parentPhones': ['88001122'],
        'studentProfile': {'fatherPhone': '95001234', 'motherPhone': '86005678'},
      });
      expect(StudentDirectory.matches(s, '9500'), isTrue);
      expect(StudentDirectory.matches(s, '8600 5678'), isTrue);
      expect(StudentDirectory.matches(s, '+976 8800-1122'), isTrue);
      expect(StudentDirectory.matches(s, '976 88001122'), isTrue);
      expect(StudentDirectory.matches(s, 'nomin9'), isTrue);
      expect(StudentDirectory.matches(s, '77'), isFalse);
      // 3-аас цөөн оронтой бол утасны цифрээр хайхгүй (нэр, кодоор л)
      expect(StudentDirectory.matches(s, '1-2'), isFalse);
      expect(StudentDirectory.phoneDigits('+976 9911-2233'), '99112233');
      expect(StudentDirectory.phoneDigits('97699112233'), '99112233');
    });
  });

  group('хоёр анги (математик + Нийгэм)', () {
    test('чиглэл: subject эсвэл нэрээр', () {
      expect(classTrack('12-4 (Баруун 4)'), ClassTrack.math);
      expect(classTrack('НИЙГЭМ (Зүүн 4)'), ClassTrack.socialStudies);
      expect(classTrack('Нийгэм 2'), ClassTrack.socialStudies);
      expect(classTrack('12-4', 'SOCIAL_STUDIES'), ClassTrack.socialStudies);
      expect(classTrack('SAT бэлтгэл', 'SAT'), ClassTrack.sat);
    });

    test('мөрийн ангийн нэр, ангийн шүүлтүүр нөгөө ангиар ч олно', () {
      final s = _s({
        'currentClassroom': {'id': 'c1', 'name': '10А'},
        'otherClassrooms': [
          {'id': 'c7', 'name': 'НИЙГЭМ (Зүүн 4)'},
        ],
      });
      expect(s.shownClassNames, '10А + НИЙГЭМ (Зүүн 4)');
      expect(const StudentFilters(classroomId: 'c7').accepts(s), isTrue);
      expect(const StudentFilters(classroomId: 'c1').accepts(s), isTrue);
      expect(const StudentFilters(classroomId: 'c2').accepts(s), isFalse);
      expect(StudentFacets.of([s]).classrooms.map((c) => c.id), containsAll(['c1', 'c7']));
      expect(classNames(null, const []), isNull);
    });

    test('өөр чиглэлийн анги сонговол нэмж бүртгэнэ, ижил чиглэл бол шилжинэ', () {
      const math = ClassroomRef(id: 'c1', name: '10А');
      const math2 = ClassroomRef(id: 'c2', name: '9Б');
      const social = ClassroomRef(id: 'c7', name: 'НИЙГЭМ (Зүүн 4)');
      expect(addsClass(math, social), isTrue);
      expect(addsClass(math, math2), isFalse);
      expect(addsClass(null, social), isFalse);
      expect(
        ClassroomRef.fromJson({'id': 'x', 'name': 'A', 'subject': 'SOCIAL_STUDIES'}).track,
        ClassTrack.socialStudies,
      );
    });

    testWidgets('сурагчийн «Мэдээлэл»: хоёр ангийн нэр', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/users/s1', {
          'id': 's1',
          'role': 'STUDENT',
          'firstName': 'Тэмүүжин',
          'lastName': 'Б',
          'studentProfile': {'grade': 12},
          'currentClassroom': {'id': 'c1', 'name': '12-4 (Баруун 4)'},
          'otherClassrooms': [
            {'id': 'c7', 'name': 'НИЙГЭМ (Зүүн 4)'},
          ],
          'classHistory': <Object?>[],
        });
      await pumpTeacher(tester, const StudentScreen(studentId: 's1'), http: http);
      await tester.ensureVisible(find.text('Мэдээлэл'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Мэдээлэл'));
      await settle(tester, frames: 20);
      expect(find.text('12-4 (Баруун 4) + НИЙГЭМ (Зүүн 4)'), findsOneWidget);
      expect(find.text('12-р анги'), findsNothing);
    });
  });

  group('Сургалтаас хасах (вэб 2026-11-08)', () {
    Map<String, Object?> preview() {
      final j = withdrawalPreviewJson(refund: 100000);
      final r = Map<String, Object?>.of(j['result']! as Map<String, Object?>);
      final cycles = [for (final c in r['cycles']! as List) Map<String, Object?>.of(c as Map<String, Object?>)];
      cycles.last['assumed'] = 2;
      r
        ..['cycles'] = cycles
        ..['refundedBefore'] = 100000;
      return {
        ...j,
        'result': r,
        'webStart': '2026-10-23',
        'noSchedule': true,
        'lastCycleDays': [
          {'date': '2026-10-06', 'status': null, 'note': null, 'leave': false, 'excluded': false, 'assumed': true},
        ],
      };
    }

    test('загвар: assumed, refundedBefore, webStart, noSchedule; хуучин хадгалсанд 0/false', () {
      final p = WithdrawalPreview.fromJson(preview());
      expect(p.cycles.last.assumed, 2);
      expect(p.refundedBefore, 100000);
      expect(p.webStart, '2026-10-23');
      expect(p.noSchedule, isTrue);
      expect(p.lastCycleDays.single.assumed, isTrue);
      final old = WithdrawalPreview.fromJson(withdrawalPreviewJson());
      expect((old.refundedBefore, old.noSchedule, old.cycles.last.assumed), (0, false, 0));
    });

    testWidgets('хураангуй: өмнө буцаасан, вэбээс өмнөх хичээл, хуваарьгүй анхааруулга', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: Scaffold(
            body: SingleChildScrollView(child: WithdrawalSummaryView(data: WithdrawalPreview.fromJson(preview()))),
          ),
        ),
      );
      expect(find.textContaining('өмнө буцаасан'), findsOneWidget);
      expect(find.text('Өмнө буцаасан'), findsOneWidget);
      expect(find.textContaining('(2 нь вэбээс өмнө, суусанд тооцсон)'), findsOneWidget);
      expect(
        find.text('Ангийн хуваарь алга тул хичээлийн тоо бодогдоогүй — хуваариа оруулаад дахин шалгана уу'),
        findsOneWidget,
      );
    });
  });
}
