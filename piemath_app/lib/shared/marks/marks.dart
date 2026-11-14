import 'package:flutter/material.dart';
import 'package:json_annotation/json_annotation.dart';

import '../../core/ui/tokens.dart';
import 'mark_icons.dart';

export 'mark_icons.dart';

// Ирц, даалгаврын тэмдэглэгээ — сурагч, эцэг эх, багшийн дэлгэц БҮГД энийг хэрэглэнэ
// (вэбийн `components/attendance/marks.tsx` + `student-hub/Marks.tsx`).
//
// Дүрэм: өнгө дангаараа утга илэрхийлэхгүй — дүрс + бичиг (compact үед бичиг дэлгэц
// уншигчид). Шар өнгө хориотой — «Дутуу», «Хоцорсон» нь `warning` (улбар) токен.
//
//   AttendanceMarkView(status: AttendanceStatus.late, lateRange: LateRange.tenToThirty)
//   HomeworkMarkView(status: HomeworkStatus.partial, compact: true)

/// Prisma `AttendanceStatus`.
@JsonEnum(fieldRename: FieldRename.screamingSnake)
enum AttendanceStatus { present, late, absent, excused }

/// Prisma `HomeworkMarkStatus` (DONE / PARTIAL / NOT_DONE).
@JsonEnum(fieldRename: FieldRename.screamingSnake)
enum HomeworkStatus { done, partial, notDone }

/// Хоцорсон хугацаа (LATE үед л).
@JsonEnum(fieldRename: FieldRename.screamingSnake)
enum LateRange { fiveToTen, tenToThirty, thirtyToSixty, overOneHour }

/// Тэмдэглэгээний өнгөний аяс — токеноос.
enum MarkTone { success, warning, error, info, neutral }

extension MarkToneColor on MarkTone {
  Color color(AppColors c) => switch (this) {
        MarkTone.success => c.success,
        MarkTone.warning => c.warning,
        MarkTone.error => c.error,
        MarkTone.info => c.info,
        MarkTone.neutral => c.inkDim,
      };
}

/// Нэг тэмдэглэгээний шошго, дүрс, аяс.
@immutable
class MarkMeta {
  const MarkMeta(this.label, this.glyph, this.tone);

  final String label;
  final MarkGlyph glyph;
  final MarkTone tone;
}

/// Ирцийн дараалал (тайлбар, тоонд): Ирсэн, Хоцорсон, Тасалсан, Чөлөөтэй.
const attendanceOrder = AttendanceStatus.values;

/// Даалгаврын дараалал: Хийсэн, Дутуу, Хийгээгүй.
const homeworkOrder = HomeworkStatus.values;

MarkMeta attendanceMeta(AttendanceStatus s) => switch (s) {
      AttendanceStatus.present => const MarkMeta('Ирсэн', MarkGlyph.attPresent, MarkTone.success),
      AttendanceStatus.late => const MarkMeta('Хоцорсон', MarkGlyph.attLate, MarkTone.warning),
      AttendanceStatus.absent => const MarkMeta('Тасалсан', MarkGlyph.attAbsent, MarkTone.error),
      AttendanceStatus.excused => const MarkMeta('Чөлөөтэй', MarkGlyph.attExcused, MarkTone.info),
    };

MarkMeta homeworkMeta(HomeworkStatus s) => switch (s) {
      HomeworkStatus.done => const MarkMeta('Хийсэн', MarkGlyph.hwDone, MarkTone.success),
      HomeworkStatus.partial => const MarkMeta('Дутуу', MarkGlyph.hwPartial, MarkTone.warning),
      HomeworkStatus.notDone => const MarkMeta('Хийгээгүй', MarkGlyph.hwMissing, MarkTone.error),
    };

/// «5–10 мин» гэх мэт (вэбийн `LATE_RANGE_SHORT`).
String lateRangeShort(LateRange r) => switch (r) {
      LateRange.fiveToTen => '5–10 мин',
      LateRange.tenToThirty => '10–30 мин',
      LateRange.thirtyToSixty => '30–60 мин',
      LateRange.overOneHour => '1 ц+',
    };

/// API мөрөөс (танихгүй утга → null).
AttendanceStatus? parseAttendanceStatus(String? v) => switch (v) {
      'PRESENT' => AttendanceStatus.present,
      'LATE' => AttendanceStatus.late,
      'ABSENT' => AttendanceStatus.absent,
      'EXCUSED' => AttendanceStatus.excused,
      _ => null,
    };

HomeworkStatus? parseHomeworkStatus(String? v) => switch (v) {
      'DONE' => HomeworkStatus.done,
      'PARTIAL' => HomeworkStatus.partial,
      'NOT_DONE' => HomeworkStatus.notDone,
      _ => null,
    };

LateRange? parseLateRange(String? v) => switch (v) {
      'FIVE_TO_TEN' => LateRange.fiveToTen,
      'TEN_TO_THIRTY' => LateRange.tenToThirty,
      'THIRTY_TO_SIXTY' => LateRange.thirtyToSixty,
      'OVER_ONE_HOUR' => LateRange.overOneHour,
      _ => null,
    };

/// Дүрс + шошго. [compact] үед шошго зөвхөн дэлгэц уншигчид (жагсаалтын мөрөнд).
class MarkView extends StatelessWidget {
  const MarkView({super.key, required this.meta, this.compact = false, this.suffix, this.iconSize = 18});

  final MarkMeta meta;
  final bool compact;

  /// Шошгоны ард (ж: «10–30 мин»).
  final String? suffix;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    final label = suffix == null ? meta.label : '${meta.label} $suffix';
    final icon = MarkIcon(meta.glyph, color: meta.tone.color(context.colors), size: iconSize);
    return Semantics(
      label: label,
      excludeSemantics: true,
      child: compact
          ? Tooltip(message: label, excludeFromSemantics: true, child: icon)
          : Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                icon,
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    label,
                    style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
    );
  }
}

/// Ирц. `status` null = «Ирц тэмдэглээгүй».
class AttendanceMarkView extends StatelessWidget {
  const AttendanceMarkView({super.key, required this.status, this.lateRange, this.compact = false});

  final AttendanceStatus? status;
  final LateRange? lateRange;
  final bool compact;

  static const noneMeta = MarkMeta('Ирц тэмдэглээгүй', MarkGlyph.none, MarkTone.neutral);

  @override
  Widget build(BuildContext context) {
    final s = status;
    if (s == null) return MarkView(meta: noneMeta, compact: compact);
    return MarkView(
      meta: attendanceMeta(s),
      compact: compact,
      suffix: s == AttendanceStatus.late && lateRange != null ? lateRangeShort(lateRange!) : null,
    );
  }
}

/// Даалгавар. `status` null = «Шалгаагүй».
class HomeworkMarkView extends StatelessWidget {
  const HomeworkMarkView({super.key, required this.status, this.compact = false});

  final HomeworkStatus? status;
  final bool compact;

  static const noneMeta = MarkMeta('Шалгаагүй', MarkGlyph.none, MarkTone.neutral);

  @override
  Widget build(BuildContext context) {
    final s = status;
    return MarkView(meta: s == null ? noneMeta : homeworkMeta(s), compact: compact);
  }
}

/// Тайлбар (legend) — жагсаалтын ДООР байрлуулна (RULES §3).
class MarkLegend extends StatelessWidget {
  const MarkLegend({super.key, required this.items, this.title});

  final List<MarkMeta> items;
  final String? title;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: title,
      child: Wrap(
        spacing: AppSpace.lg,
        runSpacing: AppSpace.sm,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          for (final m in items)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                MarkIcon(m.glyph, color: m.tone.color(context.colors), size: 16),
                const SizedBox(width: 4),
                Text(m.label, style: context.text.bodySmall),
              ],
            ),
        ],
      ),
    );
  }
}
