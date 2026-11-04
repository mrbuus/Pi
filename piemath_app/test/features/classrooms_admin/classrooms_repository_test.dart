import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/token_holder.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/network/api_client.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/features/classrooms_admin/application/classrooms_admin_providers.dart';
import 'package:piemath_app/features/classrooms_admin/data/classrooms_admin_models.dart';
import 'package:piemath_app/features/classrooms_admin/data/classrooms_admin_repository.dart';
import 'package:piemath_app/features/classrooms_admin/ui/classroom_sheets.dart';
import 'package:piemath_app/shared/native/native.dart';

import '../../helpers/fake_http.dart';
import 'classrooms_fixtures.dart';

ClassroomsAdminRepository _repo(FakeHttp http) =>
    ClassroomsAdminRepository(ApiClient(baseUrl: 'https://api.test/api', tokens: TokenHolder(), dio: http.dio()));

void main() {
  group('Загвар', () {
    test('жагсаалтын мөр: төрөл, анги, багш (Багш+ «+»), туслах, тоо', () {
      final a = AdminClassroom.fromJson(classroom('c1', '12А', teacher: teacherT1, assistant: teacherT2, count: 5));
      expect(a.kind, ClassroomKind.inPerson);
      expect(a.studentCount, 5);
      expect(a.meta(), ['Танхим', '12-р анги', 'Д. Болд', 'Туслах: Г. Сараа+', '5 сурагч']);
      final b = AdminClassroom.fromJson(
        classroom('c2', 'Онлайн 9', type: 'ONLINE', grade: null, subject: 'SOCIAL_STUDIES'),
      );
      expect(b.meta(), ['Онлайн', 'Нийгмийн ухаан', 'Багш сонгоогүй', '2 сурагч']);
      expect(a.matches('болд'), isTrue);
      expect(a.matches('12а'), isTrue);
      expect(a.matches('сараа'), isTrue);
      expect(b.matches('болд'), isFalse);
    });

    test('архивлах код = өнөөдрийн UB огноо ЖЖЖЖССӨӨ', () {
      expect(todayCodeUB(classroomsToday), '20261104');
    });

    test('засвар: зөвхөн өөрчилсөн талбар, хоосон анги = null, багшгүй = хоосон мөр', () {
      final c = AdminClassroom.fromJson(roomA);
      final none = editPatch(
        c,
        FormValues(const {
          'name': '12А',
          'kind': ClassroomKind.inPerson,
          'grade': 12,
          'subject': ClassSubject.math,
          'teacher': 't1',
          'assistant': '',
        }),
      );
      expect(none.toJson(), isEmpty);
      final changed = editPatch(
        c,
        FormValues(const {
          'name': '12А анги',
          'kind': ClassroomKind.online,
          'grade': 0,
          'subject': ClassSubject.social,
          'teacher': '',
          'assistant': 't2',
        }),
      );
      expect(changed.toJson(), {
        'name': '12А анги',
        'type': 'ONLINE',
        'grade': null,
        'subject': 'SOCIAL_STUDIES',
        'teacherId': '',
        'assistantTeacherId': 't2',
      });
      final math = editPatch(
        AdminClassroom.fromJson(classroom('c9', 'Н', subject: 'SOCIAL_STUDIES')),
        FormValues(const {'name': 'Н', 'subject': ClassSubject.math, 'grade': 12, 'teacher': '', 'assistant': ''}),
      );
      expect(math.toJson(), {'subject': null});
    });

    test('CSV: BOM, CRLF, хашилт, томьёоны хамгаалалт, тоо хашилтгүй', () {
      expect(csvCell('=SUM(A1)'), '"\'=SUM(A1)"');
      expect(csvCell('А "Б"'), '"А ""Б"""');
      expect(csvCell(12), '12');
      expect(csvCell(null), '""');
      final rows = RegistryData(
        classrooms: [AdminClassroom.fromJson(roomA)],
        entries: [
          RegistryEntry.fromJson({
            'id': 'e1',
            'joinedAt': '2026-09-01T20:00:00.000Z',
            'student': {
              ...studentS1,
              'studentProfile': {'school': '5-р сургууль', 'grade': 12},
            },
            'classroom': {'id': 'c1', 'name': '12А'},
          }),
        ],
        unassigned: [UnassignedStudent.fromJson(unassigned('u1', 'Дөлгөөн', 'Мөнх'))],
      ).rows;
      final csv = registryCsv(rows);
      expect(csv.startsWith('﻿"Код","Овог"'), isTrue);
      expect(csv.endsWith('\r\n'), isTrue);
      // UB огноо: 20:00Z = дараагийн өдрийн 04:00
      expect(csv, contains('"B27120001","Бат","Анар","5-р сургууль",12,"12А","2026-09-02","Идэвхтэй"'));
      expect(csv, contains('"","Мөнх","Дөлгөөн","1-р сургууль",10,"","2026-10-01","Ангид хуваарилагдаагүй"'));
    });
  });

  group('Эрх (вэбтэй ижил)', () {
    test('Админ: бүгд', () {
      const a = ClassroomsAccess(role: UserRole.admin, userId: 'a');
      expect([
        a.canManage,
        a.canEditInfo,
        a.canArchive,
        a.canAssignTeachers,
        a.canDisband,
        a.canCreate,
      ], everyElement(isTrue));
      expect(a.canOpenDismissal, isTrue);
    });

    test('Багш+: засах, архивлахгүй; сурагч удирдах нь серверийн эрхээр', () {
      const p = ClassroomsAccess(role: UserRole.teacherPlus, userId: 't2');
      expect(p.canManage, isTrue);
      expect(p.canEditInfo, isFalse);
      expect(p.canArchive, isFalse);
      expect(p.canAssignTeachers, isTrue);
      expect(p.canDisband, isTrue);
      final yes = ClassroomDetail.fromJson(detail(roomA, const []));
      final no = ClassroomDetail.fromJson(detail(roomA, const [], canManageStudents: false));
      expect(p.canManageStudents(yes), isTrue);
      expect(p.canManageStudents(no), isFalse);
    });

    test('Багш: удирдлага нээгдэхгүй, тарах цаг зөвхөн өөрийн анги', () {
      const t = ClassroomsAccess(role: UserRole.teacher, userId: 't1');
      expect(t.canManage, isFalse);
      expect(t.canManageStudents(ClassroomDetail.fromJson(detail(roomA, const []))), isFalse);
      expect(t.canOpenDismissal, isTrue);
      final all = [roomA, roomB, roomC].map(AdminClassroom.fromJson).toList();
      expect(t.dismissalClasses(all).map((c) => c.id), ['c1']);
      expect(const ClassroomsAccess(role: UserRole.teacherPlus, userId: 't2').dismissalClasses(all).map((c) => c.id), [
        'c2',
      ]);
      expect(const ClassroomsAccess(role: UserRole.admin).dismissalClasses(all).length, 3);
      expect(const ClassroomsAccess(role: UserRole.student).canOpenDismissal, isFalse);
    });
  });

  group('Repository', () {
    test('жагсаалт, дэлгэрэнгүй (эрхтэй), ангигүй сурагчид', () async {
      final http = classroomsHttp(canManageStudents: false);
      final repo = _repo(http);
      final list = await repo.list();
      expect(list.map((c) => c.name), ['12А', '11Б', '10В']);
      expect(list[1].kind, ClassroomKind.online);
      expect(list[1].teacher?.name, 'Г. Сараа+');
      final d = await repo.detail('c1');
      expect(d.students.map((s) => s.fullName), ['Бат Анар', 'Очир Тэмүүлэн']);
      expect(d.canManageStudents, isFalse);
      expect(ubDay(d.students.first.joinedAt), '2026.09.01');
      final waiting = await repo.unassigned();
      expect(waiting.single.school, '1-р сургууль');
    });

    test('хайлт: 2-оос цөөн тэмдэгт бол хүсэлтгүй', () async {
      final http = FakeHttp()..json('GET', '/users/search', [studentS1]);
      final repo = _repo(http);
      expect(await repo.searchStudents(' а '), isEmpty);
      expect(http.requests, isEmpty);
      final hits = await repo.searchStudents('Ан');
      expect(hits.single.studentCode, 'B27120001');
      expect(http.requests.single.queryParameters['q'], 'Ан');
    });

    test('нэмэх, хасах (зөөлөн), шилжүүлэх, багш, засах, архивлах, тараах — зам ба бие', () async {
      final http = classroomsHttp()..json('DELETE', '/classrooms/c1?confirmCode=20261104', {'archived': true});
      final repo = _repo(http);
      await repo.enroll('c1', 'u1');
      expect(requestBody(http, 'POST', '/classrooms/c1/enroll'), {'studentId': 'u1'});
      await repo.removeStudent('c1', 's1');
      expect(requestBody(http, 'POST', '/classrooms/c1/remove-student'), {'studentId': 's1'});
      await repo.setTeachers('c1', teacherId: 't2');
      expect(requestBody(http, 'PATCH', '/classrooms/c1/teachers'), {'teacherId': 't2', 'assistantTeacherId': null});
      await repo.update('c1', const ClassroomPatch(name: ' 12А шинэ ', grade: 11));
      expect(requestBody(http, 'PATCH', '/classrooms/c1'), {'name': '12А шинэ', 'grade': 11});
      await repo.archive('c1', '20261104');
      expect(http.count('DELETE', '/classrooms/c1?confirmCode=20261104'), 1);
      expect(await repo.disband('c1'), 2);
      // Хэзээ ч бүр мөсөн устгах хүсэлт явуулахгүй — зөвхөн архивын DELETE (сервер `archived: true`)
      expect(http.requests.where((r) => r.method == 'DELETE').map((r) => r.path), [
        '/classrooms/c1?confirmCode=20261104',
      ]);
    });

    test('шинэ анги: математик = null, хоосон багш илгээхгүй', () async {
      final http = FakeHttp()..json('POST', '/classrooms', classroom('c9', 'Шинэ', count: 0));
      final created = await _repo(http).create(name: ' Шинэ ', kind: ClassroomKind.online, grade: 9, teacherId: '');
      expect(created.id, 'c9');
      expect(requestBody(http, 'POST', '/classrooms'), {'name': 'Шинэ', 'type': 'ONLINE', 'grade': 9, 'subject': null});
    });

    test('серверийн монгол алдаа дамжина', () async {
      final http = FakeHttp()
        ..error('POST', '/classrooms/c1/remove-student', 403, 'Сурагч удирдах эрхийг тань админ нээгээгүй байна');
      await expectLater(
        _repo(http).removeStudent('c1', 's1'),
        throwsA(isA<ApiError>().having((e) => e.message, 'message', contains('админ нээгээгүй'))),
      );
    });

    test('бүртгэл: /classrooms/registry алга (404) бол анги бүрийн бүрэлдэхүүнээс, түүхгүй', () async {
      final http = classroomsHttp();
      final data = await _repo(http).registry(parallel: 2);
      expect(data.hasHistory, isFalse);
      expect(data.classrooms.map((c) => c.name), ['10В', '11Б', '12А']);
      expect(data.active.length, 3);
      expect(data.activeCounts, {'c1': 2, 'c2': 1});
      expect(data.rows.map((r) => r.student.fullName), ['Бат Анар', 'Мөнх Дөлгөөн', 'Очир Тэмүүлэн', 'Цэцэг Номин']);
      expect(data.rows.where((r) => r.unassigned).single.student.id, 'u1');
      for (final id in ['c1', 'c2', 'c3']) {
        expect(http.count('GET', '/classrooms/$id'), 1);
      }
    });

    test('бүртгэл: endpoint байвал түүхтэй (шинэ нь эхэнд)', () async {
      Map<String, Object?> entry(String id, String cls, String joined, {String? left}) => {
        'id': id,
        'joinedAt': '${joined}T00:00:00.000Z',
        'leftAt': left == null ? null : '${left}T00:00:00.000Z',
        'student': studentS1,
        'classroom': {'id': cls, 'name': cls == 'c1' ? '12А' : '11Б'},
      };
      final http = classroomsHttp(
        registry: (_) =>
            FakeResponse([entry('e1', 'c2', '2026-09-01', left: '2026-10-01'), entry('e2', 'c1', '2026-10-01')]),
      );
      final data = await _repo(http).registry();
      expect(data.hasHistory, isTrue);
      expect(data.histories['s1']!.map((e) => e.id), ['e2', 'e1']);
      final row = data.rows.firstWhere((r) => r.student.id == 's1');
      expect(row.classroomName, '12А');
      expect(row.historyCount, 2);
      expect(http.count('GET', '/classrooms/c1'), 0);
    });

    test('бүртгэл: бусад алдаа (500) нуугдахгүй', () async {
      final http = classroomsHttp(registry: (_) => const FakeResponse({'statusCode': 500}, status: 500));
      await expectLater(_repo(http).registry(), throwsA(isA<ApiError>()));
    });
  });

  test('ижил багш хоёр үүрэгт — монгол мессеж', () {
    expect(sameTeacherMessage, 'Ангийн багш ба туслах багш өөр хүн байх ёстой');
  });
}
