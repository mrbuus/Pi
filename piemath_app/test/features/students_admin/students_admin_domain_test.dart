import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/features/students_admin/data/students_admin_models.dart';
import 'package:piemath_app/features/students_admin/domain/student_filters.dart';
import 'package:piemath_app/features/students_admin/domain/students_perms.dart';
import 'package:piemath_app/features/students_admin/ui/student_actions.dart';

import 'students_admin_fixtures.dart';

List<AdminStudent> _students() => [for (final j in activeStudents()) AdminStudent.fromJson(j)];

StudentDirectory _dir() => StudentDirectory(
  students: _students(),
  outstanding: const {'s1': 50000},
  attention: AttentionData.fromJson(attentionJson),
);

void main() {
  group('Шүүлтүүр, хайлт', () {
    test('хичээл кодоос', () {
      expect(subjectFromCode('SIE-26-M-0001'), 'M');
      expect(subjectFromCode('SIE-26-N-12'), 'N');
      expect(subjectFromCode('M0001'), isNull);
      expect(subjectFromCode(null), isNull);
    });

    test('анги, жил, салбар, хичээл — нийлбэр нөхцөл', () {
      final d = _dir();
      List<String> ids(StudentFilters f) => d.filtered(f).map((s) => s.id).toList();
      expect(ids(const StudentFilters()), ['s1', 's2', 's3']);
      expect(ids(const StudentFilters(classroomId: 'c1')), ['s1', 's2']);
      expect(ids(const StudentFilters(classroomId: 'c1', grade: 11)), ['s2']);
      expect(ids(const StudentFilters(branch: 'Баруун 4')), ['s1']);
      expect(ids(const StudentFilters(subject: 'N')), ['s3']);
      expect(ids(const StudentFilters(subject: 'B')), isEmpty);
    });

    test('copyWith цэвэрлэх, == (reloadKey)', () {
      const f = StudentFilters(classroomId: 'c1', grade: 10);
      expect(f.copyWith(classroomId: () => null), const StudentFilters(grade: 10));
      expect(f.narrowed, isTrue);
      expect(f.cleared(), const StudentFilters());
      expect(const StudentFilters(archived: true, grade: 9).cleared(), const StudentFilters(archived: true));
    });

    test('хайлт: код, нэр, овог, утас; том жижиг үсэг хамаагүй', () {
      final s = _students().first;
      expect(StudentDirectory.matches(s, 'бат'), isTrue);
      expect(StudentDirectory.matches(s, 'БОЛД'), isTrue);
      expect(StudentDirectory.matches(s, 'm-0001'), isTrue);
      expect(StudentDirectory.matches(s, '99110001'), isTrue);
      expect(StudentDirectory.matches(s, 'дорж'), isFalse);
    });

    test('чип: ангигүй, ирэхгүй, төлбөр дутуу, хэвийн', () {
      final d = _dir();
      List<String> chip(String c) => [
        for (final s in d.students)
          if (d.inChip(s, c)) s.id,
      ];
      expect(chip(StudentChip.unassigned), ['s3']);
      expect(chip(StudentChip.absent), ['s2']);
      expect(chip(StudentChip.debt), ['s1']);
      expect(chip(StudentChip.paidOk), ['s2']);
    });

    test('төлбөрийн төлөв: дутуу дүнтэй, багцтай бол хэвийн, үгүй бол харуулахгүй', () {
      final s = _students();
      expect(paymentStatusOf(s[0], const {'s1': 50000}), (text: 'Дутуу 50,000₮', tone: PaymentTone.debt));
      expect(paymentStatusOf(s[1], const {'s1': 50000})?.tone, PaymentTone.ok);
      expect(paymentStatusOf(s[2], const {'s1': 50000}), isNull);
    });

    test('сонголтууд ачаалсан жагсаалтаас (эрэмбэлсэн)', () {
      final f = StudentFacets.of(_students());
      expect(f.classrooms, [(id: 'c1', name: '10А')]);
      expect(f.grades, [9, 10, 11]);
      expect(f.branches, ['Баруун 4', 'Зүүн 4']);
    });

    test('CSV: мөнгөгүй хүнд төлбөрийн багана байхгүй, BOM, хашилт', () {
      final rows = _students();
      final withMoney = studentsCsv(rows, withMoney: true);
      final noMoney = studentsCsv(rows, withMoney: false);
      expect(withMoney.startsWith('\u{FEFF}Код,Овог,Нэр'), isTrue);
      expect(withMoney, contains('Төлбөрийн дүн'));
      expect(withMoney, contains('Сар бүр,300000'));
      expect(noMoney, isNot(contains('Төлбөрийн')));
      expect(noMoney, isNot(contains('300000')));
      // Нэрээр эрэмбэлсэн: Бат, Дорж, Цэцэг
      final lines = noMoney.trim().split('\r\n');
      expect(lines, hasLength(4));
      expect(lines[1], startsWith('SIE-26-M-0001,Болд,Бат'));
      final quoted = studentsCsv([
        AdminStudent.fromJson(studentJson('q', first: 'А,Б', last: 'В"Г')),
      ], withMoney: false);
      expect(quoted, contains('"В""Г","А,Б"'));
    });
  });

  group('Эрхийн матриц (вэбтэй ижил)', () {
    const teacher = StudentsPerms(role: UserRole.teacher);
    const tp = StudentsPerms(role: UserRole.teacherPlus);
    const tpFinance = StudentsPerms(role: UserRole.teacherPlus, financeCapable: true);
    const tpNoFinance = StudentsPerms(role: UserRole.teacherPlus, financeCapable: false);
    const admin = StudentsPerms(role: UserRole.admin);
    const student = StudentsPerms(role: UserRole.student);

    test('Багш: зөвхөн идэвхтэй жагсаалт, мөнгө огт үгүй, үйлдэлгүй', () {
      expect(teacher.canList, isTrue);
      expect(teacher.canSeeArchive, isFalse);
      expect(teacher.canManage, isFalse);
      expect(teacher.canSeeMoney, isFalse);
      expect(teacher.canWithdraw, isFalse);
      expect(teacher.canExport, isFalse);
      expect(teacher.canExportCsv, isFalse);
      expect(teacher.canImport, isFalse);
      expect(teacher.canSeeGuardians, isFalse);
      expect(teacher.canEditProfile('STUDENT'), isFalse);
      expect(availableActions(teacher, archived: false), isEmpty);
    });

    test('Багш+: удирдана, санхүүтэй бол дүн харна, импортгүй, ажилтны профайл засахгүй', () {
      for (final p in [tp, tpFinance]) {
        expect(p.canManage, isTrue);
        expect(p.canSeeArchive, isTrue);
        expect(p.canSeeMoney, isTrue, reason: 'finance.manage (Багш+-д байнга)');
        expect(p.canWithdraw, isTrue);
        expect(p.canExport, isTrue);
        expect(p.canImport, isFalse);
        expect(p.canEditProfile('STUDENT'), isTrue);
        expect(p.canEditProfile('TEACHER'), isFalse);
      }
      expect(availableActions(tp, archived: false), [
        StudentAction.moveClass,
        StudentAction.withdraw,
        StudentAction.archive,
        StudentAction.editProfile,
        StudentAction.editRegistration,
      ]);
    });

    test('санхүүгүй Багш+: дүн, хасах тооцоо, CSV үгүй; бусад удирдлага хэвээр', () {
      expect(tpNoFinance.canSeeMoney, isFalse);
      expect(tpNoFinance.canWithdraw, isFalse);
      expect(tpNoFinance.canExportCsv, isFalse);
      expect(tpNoFinance.canEditTuition, isFalse);
      expect(tpNoFinance.canManage, isTrue);
      expect(availableActions(tpNoFinance, archived: false), isNot(contains(StudentAction.withdraw)));
    });

    test('Админ: бүгд', () {
      expect(admin.canSeeMoney, isTrue);
      expect(admin.canImport, isTrue);
      expect(admin.canEditProfile('TEACHER_PLUS'), isTrue);
      expect(availableActions(admin, archived: true), [
        StudentAction.restore,
        StudentAction.editProfile,
        StudentAction.editRegistration,
      ]);
    });

    test('ажилтан биш role юу ч харахгүй', () {
      expect(student.canList, isFalse);
      expect(student.canManage, isFalse);
      expect(student.canSeeMoney, isFalse);
      expect(const StudentsPerms(role: null).canList, isFalse);
    });
  });

  group('Бүртгэлийн маягтын өөрчлөлт', () {
    final d = AdminStudentDetail.fromJson({
      'id': 's1',
      'role': 'STUDENT',
      'firstName': 'Бат',
      'lastName': 'Болд',
      'studentProfile': {
        'branch': 'Баруун 4',
        'section': null,
        'joinedOn': '2026-09-01T00:00:00.000Z',
        'tuitionPlan': 'MONTHLY',
        'tuitionAmount': 300000,
      },
    });

    test('өөрчлөгдөөгүй бол хоосон', () {
      expect(
        registrationPatch(
          d,
          branch: 'Баруун 4',
          section: '',
          joinedOn: '2026-09-01',
          money: true,
          plan: TuitionPlan.monthly,
          amount: 300000,
        ),
        isEmpty,
      );
    });

    test('зөвхөн өөрчилсөн талбар; мөнгөгүй бол төлбөр илгээхгүй', () {
      expect(
        registrationPatch(
          d,
          branch: 'Зүүн 4',
          section: '12-2',
          leftOn: '2026-11-03',
          money: false,
          plan: TuitionPlan.fullYear,
          amount: 1,
        ),
        {'branch': 'Зүүн 4', 'section': '12-2', 'leftOn': '2026-11-03'},
      );
      expect(
        registrationPatch(
          d,
          branch: 'Баруун 4',
          section: '',
          money: true,
          plan: TuitionPlan.fullYear,
          amount: 2800000,
          note: 'Хөнгөлөлт',
        ),
        {'tuitionPlan': 'FULL_YEAR', 'tuitionAmount': 2800000, 'tuitionNote': 'Хөнгөлөлт'},
      );
    });
  });
}
