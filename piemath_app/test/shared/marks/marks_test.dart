import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/shared/marks/marks.dart';

import '../../helpers/pump.dart';

void main() {
  test('API мөрийг танина, танихгүйг null', () {
    expect(parseAttendanceStatus('EXCUSED'), AttendanceStatus.excused);
    expect(parseAttendanceStatus('SICK'), isNull);
    expect(parseHomeworkStatus('NOT_DONE'), HomeworkStatus.notDone);
    expect(parseLateRange('OVER_ONE_HOUR'), LateRange.overOneHour);
    expect(parseLateRange(null), isNull);
  });

  test('шошго вэбтэй ижил, «өвчтэй» байхгүй', () {
    expect([for (final s in attendanceOrder) attendanceMeta(s).label], ['Ирсэн', 'Хоцорсон', 'Тасалсан', 'Чөлөөтэй']);
    expect([for (final s in homeworkOrder) homeworkMeta(s).label], ['Хийсэн', 'Дутуу', 'Хийгээгүй']);
    expect(lateRangeShort(LateRange.tenToThirty), '10–30 мин');
  });

  test('«Дутуу», «Хоцорсон» — warning (шар биш)', () {
    expect(homeworkMeta(HomeworkStatus.partial).tone, MarkTone.warning);
    expect(attendanceMeta(AttendanceStatus.late).tone, MarkTone.warning);
  });

  test('бүх дүрс зөв SVG', () {
    for (final g in MarkGlyph.values) {
      final svg = markSvg(g);
      expect(svg, startsWith('<svg'));
      expect(svg, endsWith('</svg>'));
    }
  });

  testWidgets('бичигтэй хэлбэр: дүрс + шошго + хоцролт', (tester) async {
    await pumpThemed(
      tester,
      const Column(
        children: [
          AttendanceMarkView(status: AttendanceStatus.late, lateRange: LateRange.fiveToTen),
          HomeworkMarkView(status: null),
          AttendanceMarkView(status: null),
        ],
      ),
    );
    expect(find.text('Хоцорсон 5–10 мин'), findsOneWidget);
    expect(find.text('Шалгаагүй'), findsOneWidget);
    expect(find.text('Ирц тэмдэглээгүй'), findsOneWidget);
    expect(find.byType(MarkIcon), findsNWidgets(3));
  });

  testWidgets('compact: бичиг дэлгэц уншигчид л (өнгө дангаараа биш)', (tester) async {
    await pumpThemed(tester, const Center(child: HomeworkMarkView(status: HomeworkStatus.done, compact: true)));
    expect(find.text('Хийсэн'), findsNothing);
    expect(find.bySemanticsLabel('Хийсэн'), findsOneWidget);
  });

  testWidgets('тайлбар (legend)', (tester) async {
    await pumpThemed(tester, MarkLegend(items: [for (final s in attendanceOrder) attendanceMeta(s)]));
    expect(find.text('Чөлөөтэй'), findsOneWidget);
    expect(find.byType(MarkIcon), findsNWidgets(4));
  });
}
