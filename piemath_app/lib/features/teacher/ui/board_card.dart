import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/marks/marks.dart';
import '../application/board_controller.dart';
import '../application/staff_providers.dart';
import '../data/staff_models.dart';
import '../domain/board_logic.dart';
import 'board_note_sheet.dart';
import 'online_homework_sheet.dart';
import 'teacher_icons.dart';
import 'teacher_widgets.dart';

/// Вэбийн `sm` (640px): түүнээс өргөн дэлгэцэнд таблетын байрлал (нэр зүүн баганад, мөрийн шошго үгээр).
const double boardWideBreakpoint = 640;

/// Самбарыг таблетын байрлалаар зурах эсэх.
bool isBoardWide(BuildContext context) => MediaQuery.sizeOf(context).width >= boardWideBreakpoint;

/// Үүнээс өргөн дэлгэцэнд хайрцаг нэг мөрт (дүрс + бичиг хажуу тийш); нарийн таблетад бичиг тасрахгүйн тулд
/// утас шиг дүрс дээр, бичиг доор.
const double boardInlineBreakpoint = 1024;

/// Мөрийн шошгоны баганы өргөн (вэбийн `COLS`: утсан дээр 1.5rem, том дэлгэцэнд 5.75rem).
double boardLabelWidth({required bool wide}) => wide ? 92 : 24;

/// Нэг сурагчийн карт (вэбийн `StudentCard`): толгой (дугаар, нэр, илгээсэн, ⋯), доор нь ижил
/// багануудтай хоёр мөр — «Ирц» 4 хайрцаг, «Даалгавар» 3 хайрцаг + «Онлайн». Зөвхөн энэ сурагчийн
/// бүртгэл өөрчлөгдөхөд дахин зурагдана (`select`).
class BoardStudentCard extends ConsumerWidget {
  const BoardStudentCard({
    super.key,
    required this.args,
    required this.className,
    required this.studentId,
    required this.index,
    required this.name,
    required this.homework,
    required this.onlineTests,
    required this.past,
    required this.wide,
  });

  final BoardArgs args;
  final String className;
  final String studentId;

  /// Жагсаалт дахь дугаар (1-ээс).
  final int index;
  final String name;

  /// Танхимын анги — даалгаврын мөр харагдана.
  final bool homework;

  /// Өмнөх хичээлд онлайн гэрийн даалгаврын тест байсан.
  final bool onlineTests;

  /// Өнгөрсөн өдөр — нөхөх хичээлийн төлөв харагдана.
  final bool past;
  final bool wide;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final board = boardControllerProvider(args);
    final rec = ref.watch(board.select((s) => s.recs[studentId] ?? DayRec.empty));
    final sent = ref.watch(board.select((s) => s.sent.contains(studentId)));
    final risk = ref.watch(board.select((s) => riskText(s.risk[studentId])));
    final day = (classId: args.classId, date: args.date);
    // Онлайн оноо зөвхөн танхимын анги, нөхөх төлөв зөвхөн өнгөрсөн өдөр (вэбтэй ижил).
    final online = homework ? ref.watch(onlineMarksProvider(day).select((a) => a.value?.students[studentId])) : null;
    final makeupStatus = past ? ref.watch(dayMakeupProvider(day).select((a) => a.value?[studentId])) : null;
    final makeup = makeupStatus != null && showsMakeup(rec) ? makeupStatus : null;

    final c = context.colors;
    final awaiting = awaitingCheck(rec, homework: homework, sent: sent);
    final preview = notePreview(rec, homework: homework);
    void openNote() => BoardNoteSheet.open(context, args: args, studentId: studentId, name: name);

    final head = <Widget>[
      _RiskMark(risk),
      const SizedBox(width: 6),
      SizedBox(
        width: 20,
        child: Text(
          '$index',
          style: context.text.labelSmall?.copyWith(
            color: c.inkDim,
            fontSize: 12,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ),
      Flexible(
        flex: 3,
        child: _NameButton(studentId: studentId, name: name),
      ),
      if (sent) ...[const SizedBox(width: 6), const SentMark()],
      // Таблетын нарийн нэрийн баганад нэр тасрахгүйн тулд «Шалгаагүй» доод мөрөнд.
      if (awaiting && !wide) ...[const SizedBox(width: 6), const AwaitingBadge()],
    ];
    final rows = _MarkRows(
      args: args,
      className: className,
      studentId: studentId,
      name: name,
      rec: rec,
      homework: homework,
      onlineTests: onlineTests,
      online: online,
      sent: sent,
      wide: wide,
    );
    final more = _MoreButton(
      key: ValueKey('note-$studentId'),
      name: name,
      highlight: needsDetail(rec, homework: homework),
      onTap: openNote,
    );

    final Widget body = wide
        ? Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 176,
                child: Padding(
                  padding: const EdgeInsets.only(left: AppSpace.xs, top: AppSpace.xs),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: head),
                      if (awaiting)
                        const Padding(padding: EdgeInsets.only(left: 42, bottom: 2), child: AwaitingBadge()),
                      if (makeup != null)
                        Padding(
                          padding: const EdgeInsets.only(left: 42, bottom: 2),
                          child: MakeupChip(status: makeup),
                        ),
                      if (preview.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(left: 42),
                          child: _NotePreview(text: preview, onTap: openNote),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: AppSpace.md),
              Expanded(child: rows),
              const SizedBox(width: AppSpace.md),
              more,
            ],
          )
        : Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const SizedBox(width: AppSpace.xs),
                  ...head,
                  if (makeup != null) ...[
                    const SizedBox(width: 6),
                    Flexible(flex: 2, child: MakeupChip(status: makeup)),
                  ],
                  if (preview.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    Expanded(
                      flex: 2,
                      child: _NotePreview(text: preview, onTap: openNote),
                    ),
                  ] else
                    const Spacer(),
                  more,
                ],
              ),
              const SizedBox(height: 2),
              rows,
            ],
          );

    return DecoratedBox(
      key: ValueKey('card-$studentId'),
      decoration: BoxDecoration(
        // Даалгавраа илгээсэн ч шалгаагүй бол өөр өнгөөр тодорно; тэмдэглэмэгц энгийн болно (эзэн 2026-11-03).
        color: awaiting ? Color.alphaBlend(c.brandBright.withValues(alpha: 0.08), c.surface) : c.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: awaiting ? c.brandBright.withValues(alpha: 0.6) : c.line),
      ),
      child: Padding(padding: EdgeInsets.all(wide ? AppSpace.sm : 6), child: body),
    );
  }
}

/// «Ирц» ба «Даалгавар» мөр — ижил багануудтай тул хайрцгууд босоогоор тэгширнэ.
class _MarkRows extends ConsumerWidget {
  const _MarkRows({
    required this.args,
    required this.className,
    required this.studentId,
    required this.name,
    required this.rec,
    required this.homework,
    required this.onlineTests,
    required this.online,
    required this.sent,
    required this.wide,
  });

  final BoardArgs args;
  final String className;
  final String studentId;
  final String name;
  final DayRec rec;
  final bool homework;
  final bool onlineTests;
  final OnlineCell? online;
  final bool sent;
  final bool wide;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    BoardController ctl() => ref.read(boardControllerProvider(args).notifier);
    final inline = wide && MediaQuery.sizeOf(context).width >= boardInlineBreakpoint;
    final lateExtra = rec.att == AttendanceStatus.late && rec.lateRange != null ? lateRangeShort(rec.lateRange!) : null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BoardMarkRow(
          label: 'Ирц',
          icon: TeacherIcons.userCheck,
          labelColor: c.brand,
          background: c.brandBright.withValues(alpha: 0.07),
          semanticsLabel: 'Ирц, $name',
          wide: wide,
          inline: inline,
          lines: lateExtra != null && !inline ? 2 : 1,
          children: [
            for (final a in AttendanceStatus.values)
              BoardMarkBox(
                key: ValueKey('att-$studentId-${a.name}'),
                meta: attendanceMeta(a),
                selected: rec.att == a,
                extra: a == AttendanceStatus.late ? lateExtra : null,
                wide: inline,
                // Дахин дарвал цэвэрлэнэ.
                onTap: () => ctl().setAttendance(studentId, rec.att == a ? null : a),
              ),
          ],
        ),
        if (homework) ...[
          const SizedBox(height: AppSpace.xs),
          BoardMarkRow(
            label: 'Даалгавар',
            icon: AppIcons.homework,
            labelColor: c.inkDim,
            background: c.ink.withValues(alpha: 0.05),
            semanticsLabel: 'Даалгавар, $name',
            wide: wide,
            inline: inline,
            children: [
              for (final h in HomeworkStatus.values)
                BoardMarkBox(
                  key: ValueKey('hw-$studentId-${h.name}'),
                  meta: homeworkMeta(h),
                  selected: rec.hw == h,
                  wide: inline,
                  onTap: () => ctl().setHomework(studentId, rec.hw == h ? null : h),
                ),
              // Онлайн тест байхгүй ч сурагч дэвтрийн зураг илгээсэн бол дарж харна (эзэн 2026-11-03).
              OnlineBoxButton(
                key: ValueKey('online-$studentId'),
                kind: onlineBox(onlineTests: onlineTests, sent: sent, cell: online),
                cell: online,
                wide: inline,
                label: onlineBoxLabel(name, onlineTests: onlineTests, sent: sent, cell: online),
                onTap: () => OnlineHomeworkSheet.open(
                  context,
                  args: args,
                  className: className,
                  studentId: studentId,
                  name: name,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

/// Нэг мөр: шошго (утсан дээр зөвхөн дүрс, том дэлгэцэнд зөвхөн үг — эзэн 2026-10-18) + 4 тэнцүү хайрцаг.
class BoardMarkRow extends StatelessWidget {
  const BoardMarkRow({
    super.key,
    required this.label,
    required this.icon,
    required this.labelColor,
    required this.background,
    required this.semanticsLabel,
    required this.wide,
    required this.children,
    this.inline = false,
    this.lines = 1,
  });

  final String label;
  final IconData icon;
  final Color labelColor;
  final Color background;

  /// Бүлгийн шошго («Ирц, Б. Бат») — вэбийн `role="group" aria-label`.
  final String semanticsLabel;
  final bool wide;
  final List<Widget> children;

  /// Хайрцаг нэг мөрт (дүрс + бичиг хажуу тийш).
  final bool inline;

  /// Хайрцаг доторх бичвэрийн мөр (утсан дээр хоцорсон хугацаатай бол 2).
  final int lines;

  @override
  Widget build(BuildContext context) {
    final line = MediaQuery.textScalerOf(context).scale(inline ? 16 : 14);
    // Хүрэх талбай 48-аас багагүй; дүрс (16) + 2 + бичвэр, эсвэл өргөн дэлгэцэнд нэг мөр.
    final height = math.max(teacherTap, inline ? line + 16 : 8 + 16 + 2 + line * lines + 4);
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: semanticsLabel,
      child: DecoratedBox(
        decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(AppRadius.sm)),
        child: Padding(
          padding: const EdgeInsets.all(AppSpace.xs),
          child: SizedBox(
            height: height,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  width: boardLabelWidth(wide: wide),
                  child: ExcludeSemantics(
                    child: wide
                        ? Padding(
                            padding: const EdgeInsets.only(left: AppSpace.xs),
                            child: Align(
                              alignment: Alignment.centerLeft,
                              child: Text(
                                label,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: context.text.labelSmall?.copyWith(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: labelColor,
                                ),
                              ),
                            ),
                          )
                        : Center(child: Icon(icon, size: 16, color: labelColor)),
                  ),
                ),
                for (final w in children) ...[SizedBox(width: wide ? 6 : AppSpace.xs), Expanded(child: w)],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Тэмдэглэгээний хайрцаг: утсан дээр дүрс дээр, бичиг доор; том дэлгэцэнд нэг мөр. Сонгогдсон бол
/// `HOMEWORK_MARKS`/ирцийн аясын өнгө (хүрээ + 15% дэвсгэр + бичвэр). Өнгө анимацигүй — дарсан агшинд солигдоно.
class BoardMarkBox extends StatelessWidget {
  const BoardMarkBox({
    super.key,
    required this.meta,
    required this.selected,
    required this.onTap,
    required this.wide,
    this.extra,
  });

  final MarkMeta meta;
  final bool selected;
  final VoidCallback onTap;
  final bool wide;

  /// Сонгогдсон хайрцаг доторх нэмэлт бичиг («10–30 мин»).
  final String? extra;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final tone = meta.tone.color(c);
    final fg = selected ? tone : c.inkDim;
    final style = context.text.labelSmall?.copyWith(
      fontSize: wide ? 13 : 11,
      height: 1.25,
      color: fg,
      fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
    );
    final icon = MarkIcon(meta.glyph, color: selected ? tone : c.inkDim.withValues(alpha: 0.6), size: 16);
    final text = Text(meta.label, maxLines: 1, overflow: TextOverflow.ellipsis, style: style);
    final more = extra == null
        ? null
        : Text(
            extra!,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: style?.copyWith(fontWeight: FontWeight.w700, fontFeatures: const [FontFeature.tabularFigures()]),
          );
    final radius = BorderRadius.circular(AppRadius.sm);
    return Semantics(
      button: true,
      selected: selected,
      label: extra == null ? meta.label : '${meta.label} $extra',
      onTap: onTap,
      excludeSemantics: true,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: Ink(
            decoration: BoxDecoration(
              color: selected ? Color.alphaBlend(tone.withValues(alpha: 0.15), c.surface) : c.surface,
              borderRadius: radius,
              border: Border.all(color: selected ? tone : c.line),
            ),
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: wide ? AppSpace.sm : AppSpace.xs, vertical: AppSpace.xs),
              child: wide
                  ? Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        icon,
                        const SizedBox(width: 6),
                        Flexible(child: text),
                        if (more != null) ...[const SizedBox(width: 6), Flexible(child: more)],
                      ],
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [icon, const SizedBox(height: 2), text, ?more],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Даалгаврын мөрийн 4-р хайрцаг «Онлайн» (вэбийн `StudentCard`): оноо «9/12» эсвэл зураас.
/// Оноотой/илгээсэн бол брэнд өнгөтэй, эс бөгөөс тасархай бүдэг; онлайн тест, илгээлт хоёулаа
/// байхгүй бол дарахгүй.
class OnlineBoxButton extends StatelessWidget {
  const OnlineBoxButton({
    super.key,
    required this.kind,
    required this.label,
    required this.onTap,
    required this.wide,
    this.cell,
  });

  final OnlineBox kind;
  final OnlineCell? cell;
  final String label;
  final VoidCallback onTap;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final active = kind == OnlineBox.active;
    final fg = active ? c.brandSoft : c.inkDim.withValues(alpha: 0.7);
    final icon = Icon(AppIcons.laptop, size: 16, color: active ? fg : fg.withValues(alpha: 0.5));
    final value = cell != null
        ? Text(
            cell!.text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: context.text.labelSmall?.copyWith(
              fontSize: wide ? 13 : 11,
              height: 1.25,
              color: fg,
              fontWeight: FontWeight.w700,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          )
        : Icon(AppIcons.minus, size: 14, color: fg.withValues(alpha: 0.6));
    final content = Padding(
      padding: EdgeInsets.symmetric(horizontal: wide ? AppSpace.sm : AppSpace.xs, vertical: AppSpace.xs),
      child: Center(
        child: wide
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  icon,
                  const SizedBox(width: AppSpace.xs),
                  Flexible(
                    child: Text(
                      'Онлайн',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: context.text.labelSmall?.copyWith(fontSize: 13, height: 1.25, color: fg),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Flexible(child: value),
                ],
              )
            : Column(mainAxisSize: MainAxisSize.min, children: [icon, const SizedBox(height: 2), value]),
      ),
    );
    final radius = BorderRadius.circular(AppRadius.sm);
    if (kind == OnlineBox.placeholder) {
      return Tooltip(
        message: label,
        excludeFromSemantics: true,
        child: Semantics(
          container: true,
          label: label,
          excludeSemantics: true,
          child: DashedBox(radius: AppRadius.sm, child: content),
        ),
      );
    }
    final Widget box = active
        ? DecoratedBox(
            decoration: BoxDecoration(
              color: Color.alphaBlend(c.brandBright.withValues(alpha: 0.1), c.surface),
              borderRadius: radius,
              border: Border.all(color: c.brandBright.withValues(alpha: 0.4)),
            ),
            child: content,
          )
        : DashedBox(radius: AppRadius.sm, child: content);
    return Semantics(
      button: true,
      label: label,
      onTap: onTap,
      excludeSemantics: true,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(borderRadius: radius, onTap: onTap, child: box),
      ),
    );
  }
}

/// Шалгуур хангаагүй бол нэрийн өмнө улаан цэг (дэлгэц уншигчид шалтгаан), эс бөгөөс ижил өргөнтэй зай.
class _RiskMark extends StatelessWidget {
  const _RiskMark(this.reasons);

  final String reasons;

  @override
  Widget build(BuildContext context) {
    if (reasons.isEmpty) return const SizedBox.square(dimension: 10);
    return Tooltip(
      message: reasons,
      excludeFromSemantics: true,
      child: Semantics(label: 'Шалгуур хангаагүй: $reasons', child: const RiskDot()),
    );
  }
}

/// Шалгуур хангаагүйн улаан цэг (картад ба тайлбарт).
class RiskDot extends StatelessWidget {
  const RiskDot({super.key});

  @override
  Widget build(BuildContext context) {
    final e = context.colors.error;
    return SizedBox.square(
      dimension: 10,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: e,
          shape: BoxShape.circle,
          boxShadow: [BoxShadow(color: e.withValues(alpha: 0.2), spreadRadius: 2)],
        ),
      ),
    );
  }
}

/// Тухайн хичээлийн даалгаврыг илгээсэн сурагчийн жижиг тэмдэг (нэрийн ард) — вэбийн `SentMark`.
class SentMark extends StatelessWidget {
  const SentMark({super.key});

  @override
  Widget build(BuildContext context) => Tooltip(
    message: 'Даалгавраа илгээсэн',
    excludeFromSemantics: true,
    child: Semantics(
      label: 'Даалгавраа илгээсэн',
      child: MarkIcon(MarkGlyph.hwSent, color: context.colors.brand, size: 14),
    ),
  );
}

/// «Шалгаагүй» — илгээсэн ч багш даалгаврыг нь тэмдэглээгүй.
class AwaitingBadge extends StatelessWidget {
  const AwaitingBadge({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: c.brandBright.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(AppRadius.pill),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        child: Text(
          'Шалгаагүй',
          style: context.text.labelSmall?.copyWith(fontSize: 10, fontWeight: FontWeight.w700, color: c.brandSoft),
        ),
      ),
    );
  }
}

/// Нөхөх хичээлийн төлөв (вэбийн `MakeupChip`) — тасалсан/чөлөөтэй/хоцорсон сурагчид, өнгөрсөн өдөр.
class MakeupChip extends StatelessWidget {
  const MakeupChip({super.key, required this.status});

  final MakeupStatus status;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (IconData icon, Color? tone) = switch (status) {
      MakeupStatus.pending => (TeacherIcons.circleDashed, c.warning),
      MakeupStatus.partial => (TeacherIcons.circleDot, c.info),
      MakeupStatus.done => (TeacherIcons.circleCheck, c.success),
      MakeupStatus.waived => (TeacherIcons.circleMinus, null),
    };
    final label = makeupLabel(status);
    final fg = tone ?? c.inkDim;
    return Tooltip(
      message: 'Нөхөх хичээл: $label',
      excludeFromSemantics: true,
      child: Semantics(
        label: 'Нөхөх хичээл: $label',
        excludeSemantics: true,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: tone?.withValues(alpha: 0.1) ?? c.ink.withValues(alpha: 0.04),
            borderRadius: BorderRadius.circular(AppRadius.pill),
            border: Border.all(color: tone?.withValues(alpha: 0.4) ?? c.line),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 12, color: fg),
                const SizedBox(width: AppSpace.xs),
                Flexible(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: context.text.labelSmall?.copyWith(fontSize: 11, fontWeight: FontWeight.w600, color: fg),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Нэр — дарахад сурагчийн хуудас (вэбийн `StudentDrawer`-ийн оронд).
class _NameButton extends StatelessWidget {
  const _NameButton({required this.studentId, required this.name});

  final String studentId;
  final String name;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    void open() => context.push('/app/students/${Uri.encodeComponent(studentId)}', extra: name);
    return Semantics(
      button: true,
      label: '$name, сурагчийн мэдээлэл',
      onTap: open,
      excludeSemantics: true,
      child: InkWell(
        onTap: open,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: teacherTap),
          child: Align(
            alignment: Alignment.centerLeft,
            widthFactor: 1,
            child: Text(
              name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: context.text.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: c.ink,
                decoration: TextDecoration.underline,
                decorationStyle: TextDecorationStyle.dotted,
                decorationColor: c.inkDim.withValues(alpha: 0.4),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Хаалттай картын тэмдэглэлийн товч (дарахад «⋯»-тэй адил тэмдэглэл нээгдэнэ).
class _NotePreview extends StatelessWidget {
  const _NotePreview({required this.text, required this.onTap});

  final String text;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      label: 'Тэмдэглэл: $text',
      onTap: onTap,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: teacherTap),
          child: Row(
            children: [
              Icon(AppIcons.stickyNote, size: 14, color: c.brand),
              const SizedBox(width: AppSpace.xs),
              Flexible(
                child: Text(
                  text,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// «⋯» — тэмдэглэл (хоцролтын хугацаа, шалтгаан, бичвэр) нээх. Шалтгаан шаардлагатай бол брэнд өнгөтэй.
class _MoreButton extends StatelessWidget {
  const _MoreButton({super.key, required this.name, required this.highlight, required this.onTap});

  final String name;
  final bool highlight;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      label: 'Тэмдэглэл нээх, $name',
      onTap: onTap,
      excludeSemantics: true,
      child: Tooltip(
        message: 'Тэмдэглэл',
        excludeFromSemantics: true,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppRadius.sm),
          child: SizedBox.square(
            dimension: teacherTap,
            child: Icon(AppIcons.overflow, size: 20, color: highlight ? c.brand : c.inkDim),
          ),
        ),
      ),
    );
  }
}
