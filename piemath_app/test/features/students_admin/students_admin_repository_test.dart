import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/token_holder.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/network/api_client.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/features/students_admin/application/students_admin_providers.dart';
import 'package:piemath_app/features/students_admin/data/students_admin_models.dart';
import 'package:piemath_app/features/students_admin/data/students_admin_repository.dart';
import 'package:piemath_app/features/students_admin/domain/students_perms.dart';

import '../../helpers/fake_http.dart';
import 'students_admin_fixtures.dart';

StudentsAdminRepository repoOf(FakeHttp http) => StudentsAdminRepository(
  ApiClient(baseUrl: 'https://api.test/api', tokens: TokenHolder()..set('tkn'), dio: http.dio()),
);

Map<String, Object?> bodyOf(RequestOptions o) => (o.data as Map).cast<String, Object?>();

void main() {
  group('StudentsAdminRepository', () {
    test('жагсаалт: role=STUDENT, архив query, холимог role шүүгдэнэ, загвар задлагдана', () async {
      final http = FakeHttp()
        ..on(
          'GET',
          '/users',
          (o) => FakeResponse([
            ...activeStudents(),
            {'id': 'x', 'role': 'ADMIN', 'firstName': 'А'},
          ]),
        );
      final repo = repoOf(http);
      final rows = await repo.students();
      expect(rows.map((s) => s.id), ['s1', 's2', 's3']);
      expect(http.requests.single.queryParameters, {'role': 'STUDENT'});
      final bat = rows.first;
      expect(bat.fullName, 'Болд Бат');
      expect(bat.currentClassroom?.name, '10А');
      expect(bat.tuitionPlan, TuitionPlan.monthly);
      expect(bat.tuitionAmount, 300000);
      await repo.students(archived: true);
      expect(http.requests.last.queryParameters, {'role': 'STUDENT', 'archived': 'true'});
    });

    test('архив: сүүлийн анги, шалтгаан', () async {
      final http = studentsHttp();
      final a = (await repoOf(http).students(archived: true)).single;
      expect(a.archived, isTrue);
      expect(a.archiveReason, 'Давхар бүртгэл');
      expect(a.currentClassroom, isNull);
      expect(a.shownClassroom?.name, '9Б');
    });

    test('архивлах, сэргээх, анги солих — зөөлөн endpoint, зөв бие', () async {
      final http = FakeHttp()
        ..json('POST', '/users/s1/archive', {'id': 's1'})
        ..json('POST', '/users/s1/unarchive', {'id': 's1'})
        ..json('POST', '/classrooms/c2/enroll', {'ok': true});
      final repo = repoOf(http);
      await repo.archive('s1', '  Давхар бүртгэл ');
      await repo.unarchive('s1', classroomId: 'c2');
      await repo.unarchive('s1');
      await repo.enroll('c2', 's1');
      expect(bodyOf(http.requests[0]), {'reason': 'Давхар бүртгэл'});
      expect(bodyOf(http.requests[1]), {'classroomId': 'c2'});
      expect(bodyOf(http.requests[2]), isEmpty);
      expect(bodyOf(http.requests[3]), {'studentId': 's1'});
      expect(http.requests.where((r) => r.method == 'DELETE'), isEmpty);
    });

    test('сургалтаас хасах: preview query, хадгалах бие, буцаах дүн', () async {
      final http = FakeHttp()
        ..json('GET', '/tuition/withdrawal/preview', withdrawalPreviewJson(refund: 120000))
        ..json('POST', '/tuition/withdrawal', {'refund': 120000});
      final repo = repoOf(http);
      final p = await repo.withdrawalPreview(
        's1',
        leftOn: '2026-11-03',
        countFrom: '2026-09-01',
        exclude: ['2026-11-01'],
      );
      expect(http.requests.first.queryParameters, {
        'studentId': 's1',
        'leftOn': '2026-11-03',
        'countFrom': '2026-09-01',
        'exclude': '2026-11-01',
      });
      expect(p.refund, 120000);
      expect(p.cycles, hasLength(2));
      expect(p.cycles.last.full, isFalse);
      expect(p.lastCycleDays.first.leave, isTrue);
      final refund = await repo.withdraw(
        's1',
        leftOn: '2026-11-03',
        countFrom: p.countFrom,
        exclude: const [],
        reason: ' Төлбөр ',
      );
      expect(refund, 120000);
      expect(bodyOf(http.requests.last), {
        'studentId': 's1',
        'leftOn': '2026-11-03',
        'countFrom': '2026-09-01',
        'exclude': <Object?>[],
        'reason': 'Төлбөр',
      });
    });

    test('импорт: preview нь multipart, commit 100-аар багцлана', () async {
      final http = FakeHttp()
        ..json('POST', '/users/students/import/preview', {
          'previewId': '00000000-0000-4000-8000-000000000001',
          'rows': [
            for (var i = 2; i < 252; i++)
              {'rowNumber': i, 'lastName': 'Овог', 'firstName': 'Нэр$i', 'phone': '99000000', 'status': 'NEW'},
            {'rowNumber': 252, 'lastName': '', 'firstName': '', 'phone': '', 'status': 'ERROR', 'reason': 'Утас дутуу'},
          ],
        })
        ..on('POST', '/users/students/import/commit', (o) {
          final n = (bodyOf(o)['rowNumbers']! as List).length;
          return FakeResponse({'imported': n});
        });
      final repo = repoOf(http);
      final p = await repo.importPreview(Uint8List.fromList(utf8.encode('xlsx')), 'burtgel.xlsx');
      final up = http.requests.first;
      expect(up.data, isA<FormData>());
      expect(up.headers['Authorization'], 'Bearer tkn');
      expect((up.data as FormData).files.single.value.filename, 'burtgel.xlsx');
      expect(p.count(ImportRowStatus.create), 250);
      expect(p.count(ImportRowStatus.error), 1);
      expect(p.selectable, hasLength(250));
      final n = await repo.importCommitAll(p.previewId, p.selectable);
      expect(n, 250);
      final batches = [
        for (final r in http.requests.where((r) => r.path.endsWith('/commit')))
          (bodyOf(r)['rowNumbers']! as List).length,
      ];
      expect(batches, [100, 100, 50]);
    });

    test('импорт: дундаас тасарвал хэдэн мөр хадгалагдсаныг хэлнэ', () async {
      final http = FakeHttp()
        ..on('POST', '/users/students/import/commit', (o) => const FakeResponse({'imported': 100}))
        ..on(
          'POST',
          '/users/students/import/commit',
          (o) => const FakeResponse({'statusCode': 400, 'message': 'Хугацаа дууссан'}, status: 400),
        );
      final repo = repoOf(http);
      await expectLater(
        repo.importCommitAll('p', [for (var i = 1; i <= 150; i++) i]),
        throwsA(
          isA<ImportCommitError>()
              .having((e) => e.imported, 'imported', 100)
              .having((e) => e.message, 'message', contains('100/150')),
        ),
      );
    });

    test('алдааны монгол мессеж ApiError-оор', () async {
      final http = FakeHttp()..error('GET', '/users', 403, 'Багш зөвхөн идэвхтэй сурагчдын жагсаалтыг харна');
      await expectLater(
        repoOf(http).students(archived: true),
        throwsA(isA<ApiError>().having((e) => e.message, 'message', contains('Багш зөвхөн'))),
      );
    });
  });

  group('StudentDirectoryLoader', () {
    const admin = StudentsPerms(role: UserRole.admin);
    const teacher = StudentsPerms(role: UserRole.teacher);

    test('Админ: сурагч + энэ сарын дутуу + анхаарах; кэшээс, force-оор дахин', () async {
      final http = studentsHttp();
      final loader = StudentDirectoryLoader(repoOf(http), month: '2026-11');
      final d = await loader.load(archived: false, perms: admin);
      expect(d.students, hasLength(3));
      expect(d.outstanding, {'s1': 50000});
      expect(d.unassignedIds, {'s3'});
      expect(http.requests.firstWhere((r) => r.path == '/payments/outstanding').queryParameters, {'month': '2026-11'});
      await loader.load(archived: false, perms: admin);
      expect(http.count('GET', '/users'), 1);
      await loader.load(archived: false, perms: admin, force: true);
      expect(http.count('GET', '/users'), 2);
    });

    test('Багш: төлбөр, анхаарах сурагч ХҮСЭХГҮЙ', () async {
      final http = studentsHttp();
      final d = await StudentDirectoryLoader(repoOf(http), month: '2026-11').load(archived: false, perms: teacher);
      expect(d.outstanding, isEmpty);
      expect(d.attention, isNull);
      expect(http.count('GET', '/payments/outstanding'), 0);
      expect(http.count('GET', '/classrooms/attention-students'), 0);
    });

    test('төлбөрийн алдаа чимээгүй — жагсаалт харагдсаар', () async {
      final http = FakeHttp()
        ..json('GET', '/users', activeStudents())
        ..error('GET', '/payments/outstanding', 403, 'Эрхгүй')
        ..json('GET', '/classrooms/attention-students', attentionJson);
      final d = await StudentDirectoryLoader(repoOf(http), month: '2026-11').load(archived: false, perms: admin);
      expect(d.students, hasLength(3));
      expect(d.outstanding, isEmpty);
    });
  });
}
