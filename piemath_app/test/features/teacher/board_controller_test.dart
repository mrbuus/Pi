import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/teacher/application/board_controller.dart';
import 'package:piemath_app/features/teacher/data/teacher_models.dart';
import 'package:piemath_app/features/teacher/domain/board_logic.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import 'teacher_fixtures.dart';

const _args = (classId: 'c1', date: testDate);

Future<BoardController> _ready(ProviderContainer c) async {
  c.listen(boardControllerProvider(_args), (_, _) {});
  final ctl = c.read(boardControllerProvider(_args).notifier);
  // Сүлжээний алдааны үед ApiClient нэг удаа jitter-тэй давтана — бодит цагаар хүлээнэ.
  for (var i = 0; i < 300 && c.read(boardControllerProvider(_args)).status == BoardLoad.loading; i++) {
    await Future<void>.delayed(const Duration(milliseconds: 10));
  }
  return ctl;
}

Future<void> _idle(ProviderContainer c) async {
  for (var i = 0; i < 50; i++) {
    await Future<void>.delayed(Duration.zero);
    if (c.read(boardControllerProvider(_args)).pending == 0) return;
  }
}

Map<String, Object?> _body(FakeHttp http, String method, String path, [int index = 0]) =>
    (http.requests.where((r) => r.method == method && r.path == path).elementAt(index).data as Map)
        .cast<String, Object?>();

void main() {
  test('ачаална: ирц, эрсдэл, танхимын даалгаврын багана', () async {
    final http = boardHttp(
      board: boardJson(attendance: [attRow('s1', 'LATE', lateRange: 'FIVE_TO_TEN')]),
    );
    final c = testContainer(http: http);
    await _ready(c);
    final s = c.read(boardControllerProvider(_args));
    expect(s.status, BoardLoad.ready);
    expect(s.recs['s1']!.att, AttendanceStatus.late);
    expect(s.recs['s1']!.lateRange, LateRange.fiveToTen);
    expect(s.risk['s3']!.single.label, '5 удаа хоцорсон');
    expect(s.homework, isTrue);
  });

  test('ачааллын алдаа → error, дахин оролдоход сэргэнэ', () async {
    final http = FakeHttp()
      ..on('GET', '/attendance/classrooms/c1/board', (_) => const FakeResponse.network())
      ..json('GET', '/attendance/classrooms/c1/marks', marksJson());
    final c = testContainer(http: http);
    final ctl = await _ready(c);
    expect(c.read(boardControllerProvider(_args)).status, BoardLoad.error);
    http.json('GET', '/attendance/classrooms/c1/board', boardJson());
    await ctl.reload();
    expect(c.read(boardControllerProvider(_args)).status, BoardLoad.ready);
  });

  test('товшилт: шууд түр утга, серверийн хариугаар баталгаажна', () async {
    final done = Completer<void>();
    final http = boardHttp()
      ..on('POST', '/classrooms/c1/attendance', (req) async {
        await done.future;
        return echoAttendance((req.data as Map).cast());
      });
    final c = testContainer(http: http);
    final ctl = await _ready(c);
    ctl.setAttendance('s1', AttendanceStatus.absent);
    var s = c.read(boardControllerProvider(_args));
    expect(s.recs['s1']!.att, AttendanceStatus.absent, reason: 'optimistic');
    expect(s.pending, 1);
    done.complete();
    await _idle(c);
    s = c.read(boardControllerProvider(_args));
    expect(s.pending, 0);
    expect(s.overrides, isEmpty);
    expect(s.server.att['s1']!.status, AttendanceStatus.absent);
    expect(s.savedAt, isNotNull);
    expect(_body(http, 'POST', '/classrooms/c1/attendance'), {
      'date': testDate,
      'entries': [
        {'studentId': 's1', 'status': 'ABSENT'},
      ],
    });
  });

  test('амжилтгүй бол буцаана (rollback) ба алдааг харуулна', () async {
    final http = boardHttp()..error('POST', '/classrooms/c1/attendance', 403, 'Энэ ангид байхгүй сурагч байна: s1');
    final c = testContainer(http: http);
    final ctl = await _ready(c);
    ctl.setAttendance('s1', AttendanceStatus.present);
    expect(c.read(boardControllerProvider(_args)).recs['s1']!.att, AttendanceStatus.present);
    await _idle(c);
    final s = c.read(boardControllerProvider(_args));
    expect(s.recs['s1']!.att, isNull);
    expect(s.saveError, 'Энэ ангид байхгүй сурагч байна: s1');
  });

  test('poll хадгалагдаж буй нүдийг дарахгүй, бусдыг шинэчилнэ', () async {
    final hold = Completer<void>();
    final http = FakeHttp()
      ..json('GET', '/attendance/classrooms/c1/board', boardJson())
      ..json('GET', '/attendance/classrooms/c1/marks', marksJson(attendance: [attRow('s2', 'EXCUSED', by: 'Д. Сараа')]))
      ..on('POST', '/classrooms/c1/attendance', (req) async {
        await hold.future;
        return echoAttendance((req.data as Map).cast());
      });
    final c = testContainer(http: http);
    final ctl = await _ready(c);
    ctl.setAttendance('s1', AttendanceStatus.present);
    await ctl.poll();
    final s = c.read(boardControllerProvider(_args));
    expect(s.recs['s1']!.att, AttendanceStatus.present, reason: 'өөрийн хадгалагдаж буй утга');
    expect(s.recs['s2']!.att, AttendanceStatus.excused, reason: 'өөр багшийн тэмдэглэгээ');
    expect(s.recs['s2']!.attBy, 'Д. Сараа');
    hold.complete();
    await _idle(c);
  });

  test('«Бүгд ирсэн»: зөвхөн тэмдэглээгүй, onlyIf UNMARKED; «Буцаах» onlyIf PRESENT', () async {
    final http = boardHttp(board: boardJson(attendance: [attRow('s2', 'ABSENT')]))
      ..on('POST', '/classrooms/c1/attendance', (req) => echoAttendance((req.data as Map).cast()));
    final c = testContainer(http: http);
    final ctl = await _ready(c);
    await ctl.markAllPresent();
    var s = c.read(boardControllerProvider(_args));
    expect(s.bulkAtt, ['s1', 's3']);
    expect(s.recs['s2']!.att, AttendanceStatus.absent);
    final entries = _body(http, 'POST', '/classrooms/c1/attendance')['entries']! as List;
    expect(entries.every((e) => (e as Map)['onlyIf'] == 'UNMARKED'), isTrue);

    await ctl.undoAllPresent();
    s = c.read(boardControllerProvider(_args));
    expect(s.bulkAtt, isEmpty);
    expect(s.recs['s1']!.att, isNull);
    final undo = _body(http, 'POST', '/classrooms/c1/attendance', 1)['entries']! as List;
    expect(undo.first, {'studentId': 's1', 'status': null, 'onlyIf': 'PRESENT'});
  });

  test('«Бүгд хийсэн»: ирсэн сурагчид л', () async {
    final http = boardHttp(board: boardJson(attendance: [attRow('s1', 'PRESENT'), attRow('s2', 'ABSENT')]))
      ..on('POST', '/classrooms/c1/homework-marks/bulk', (req) {
        final entries = ((req.data as Map)['entries'] as List).cast<Map<String, Object?>>();
        return FakeResponse({
          'date': testDate,
          'applied': [for (final e in entries) e['studentId']],
          'skipped': <String>[],
          'rows': [for (final e in entries) hwRow(e['studentId'] as String, e['status'] as String?)],
        });
      });
    final c = testContainer(http: http);
    final ctl = await _ready(c);
    await ctl.markAllDone();
    final s = c.read(boardControllerProvider(_args));
    expect(s.bulkHw, ['s1']);
    expect(s.recs['s1']!.hw, HomeworkStatus.done);
    expect(s.recs['s2']!.hw, isNull);
  });

  test('тэмдэглэл: бичиж зогссоны дараа НЭГ хүсэлт', () async {
    final http = boardHttp(board: boardJson(attendance: [attRow('s1', 'ABSENT')]))
      ..on('POST', '/classrooms/c1/attendance', (req) => echoAttendance((req.data as Map).cast()));
    final c = testContainer(http: http);
    final ctl = await _ready(c);
    ctl.setNote('s1', Cell.attNote, 'а', typed: true);
    ctl.setNote('s1', Cell.attNote, 'аав', typed: true);
    expect(c.read(boardControllerProvider(_args)).recs['s1']!.attNote, 'аав');
    expect(http.count('POST', '/classrooms/c1/attendance'), 0);
    await Future<void>.delayed(typingDelay + const Duration(milliseconds: 50));
    await _idle(c);
    expect(http.count('POST', '/classrooms/c1/attendance'), 1);
    expect((_body(http, 'POST', '/classrooms/c1/attendance')['entries']! as List).single, {
      'studentId': 's1',
      'note': 'аав',
    });
  });

  test('ирцгүй сурагчид ирцийн тэмдэглэл бичихгүй', () async {
    final c = testContainer(http: boardHttp());
    final ctl = await _ready(c);
    ctl.setNote('s1', Cell.attNote, 'тэмцээн', typed: false);
    expect(c.read(boardControllerProvider(_args)).overrides, isEmpty);
  });

  test('даалгавар: PATCH, хариуны утга', () async {
    final http = boardHttp()
      ..json('PATCH', '/classrooms/c1/homework-marks/s2', {
        'student': {'id': 's2'},
        'applied': true,
        'status': 'PARTIAL',
        'comment': null,
        'markedBy': 'Б. Болд',
        'updatedAt': '2026-11-02T07:00:00.000Z',
      });
    final c = testContainer(http: http);
    final ctl = await _ready(c);
    ctl.setHomework('s2', HomeworkStatus.partial);
    await _idle(c);
    expect(c.read(boardControllerProvider(_args)).server.hw['s2']!.status, HomeworkStatus.partial);
    expect(_body(http, 'PATCH', '/classrooms/c1/homework-marks/s2'), {'date': testDate, 'status': 'PARTIAL'});
  });
}
