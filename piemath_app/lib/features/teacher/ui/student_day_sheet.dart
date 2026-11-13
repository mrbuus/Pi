import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/marks/marks.dart';
import '../../../shared/quiz_score/quiz_score.dart';
import '../data/student_calendar_models.dart';
import '../domain/student_calendar_logic.dart';

/// Хуанлийн нэг өдрийн дэлгэрэнгүй (вэбийн `DaySheet`, эзэн 2026-11-08): ЖИЖИГ доод хуудас — доош чирж,
/// гадна дарж, «Хаах»-аар хаана. Шинэ хуудас нээхгүй.
Future<void> showStudentDaySheet(
  BuildContext context, {
  required CalendarCell cell,
  required List<MakeupHistoryItem> makeups,
  required String studentId,
}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  showDragHandle: true,
  builder: (ctx) => DraggableScrollableSheet(
    expand: false,
    initialChildSize: 0.6,
    minChildSize: 0.3,
    maxChildSize: 0.92,
    builder: (ctx, scroll) => _SheetBody(cell: cell, makeups: makeups, studentId: studentId, scroll: scroll),
  ),
);

class _SheetBody extends StatelessWidget {
  const _SheetBody({required this.cell, required this.makeups, required this.studentId, required this.scroll});

  final CalendarCell cell;
  final List<MakeupHistoryItem> makeups;
  final String studentId;
  final ScrollController scroll;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final d = cell.day;
    final v = cell.makeup;
    final dim = context.text.bodyMedium?.copyWith(color: c.inkDim);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.sm, AppSpace.sm),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Semantics(header: true, child: Text(lessonDayTitle(cell.date), style: context.text.titleMedium)),
                    if (d != null)
                      Meta(
                        style: dim,
                        items: [
                          d.classroomName,
                          if (d.startMinute != null && d.endMinute != null) '${hm(d.startMinute!)}–${hm(d.endMinute!)}',
                          d.room,
                        ],
                      )
                    else
                      Text(v!.label, style: dim),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Хаах',
                constraints: const BoxConstraints(minWidth: AppSizes.minTap, minHeight: AppSizes.minTap),
                onPressed: () => Navigator.of(context).pop(),
                icon: Icon(AppIcons.close, color: c.inkDim),
              ),
            ],
          ),
        ),
        Divider(height: 1, color: c.line),
        Expanded(
          child: ListView(
            controller: scroll,
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.xl),
            children: [
              if (d != null)
                LessonDayBody(day: d, makeups: makeups)
              else
                MakeupVisitBody(visit: v!, studentId: studentId),
            ],
          ),
        ),
      ],
    );
  }
}

/// Дэлгэрэнгүйн нэг мөр: зүүн талд жижиг шошго, баруун талд утга.
class _Row extends StatelessWidget {
  const _Row({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 88,
          child: Text(
            label,
            style: context.text.labelMedium?.copyWith(color: context.colors.inkDim, fontWeight: FontWeight.w600),
          ),
        ),
        Expanded(child: child),
      ],
    ),
  );
}

class _Notice extends StatelessWidget {
  const _Notice({required this.icon, required this.text, this.color});

  final IconData icon;
  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: color ?? c.brand),
          const SizedBox(width: AppSpace.sm),
          Expanded(child: Text(text, style: context.text.bodySmall)),
        ],
      ),
    );
  }
}

/// Хичээлийн өдрийн дэлгэрэнгүй: багш, сэдэв, ирц, даалгавар (шалгалтын оноо), батламж, тэмдэглэл, нөхөлт.
class LessonDayBody extends StatelessWidget {
  const LessonDayBody({super.key, required this.day, required this.makeups});

  final LessonDay day;

  /// Тасалсан өдрийн тестийг дараа нь нөхсөн эсэхийг харуулахад.
  final List<MakeupHistoryItem> makeups;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final small = context.text.bodySmall?.copyWith(color: c.inkDim);
    final att = day.attendance;
    final hw = day.homework;
    final teachers = [?day.lead, ?day.assistant];
    final topic = day.topic == null ? null : regroupTopicText(day.topic);
    final missed = isMissed(day);
    final madeUp = madeUpFor(day, makeups);
    final rows = <Widget>[
      _Row(
        label: 'Багш',
        child: Text(
          teachers.isNotEmpty ? teachers.join(', ') : (day.scheduleTeacher ?? 'Оноогоогүй'),
          style: context.text.bodyMedium,
        ),
      ),
      _Row(
        label: 'Сэдэв',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (day.testsText != null)
              Text(day.testsText!, style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w600))
            else if (topic != null)
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(text: topic),
                    if (!day.confirmed) TextSpan(text: '  төлөвлөгөөгөөр', style: small),
                  ],
                ),
                style: context.text.bodyMedium,
              )
            else
              Text(
                day.future ? 'Төлөвлөөгүй' : 'Бүртгэгдээгүй',
                style: context.text.bodyMedium?.copyWith(color: c.inkDim),
              ),
            if (day.testsText != null && topic != null && topic != day.testsText) Text(topic, style: small),
          ],
        ),
      ),
      if (!day.future)
        _Row(
          label: 'Ирц',
          child: att == null
              ? Text('Тэмдэглээгүй', style: context.text.bodyMedium?.copyWith(color: c.inkDim))
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AttendanceMarkView(status: att.status, lateRange: att.lateRange),
                    if (att.note != null) Text(att.note!, style: context.text.bodyMedium),
                    if (att.markedBy != null) Text(att.markedBy!, style: small),
                  ],
                ),
        ),
      if (hw?.status != null || hw?.comment != null || day.quiz != null)
        _Row(
          label: 'Даалгавар',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: AppSpace.md,
                runSpacing: AppSpace.xs,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  if (hw?.status != null) HomeworkMarkView(status: hw!.status),
                  if (day.quiz != null) QuizScoreChip(score: day.quiz!.score, problemCount: day.quiz!.problemCount),
                ],
              ),
              if (hw?.comment != null) Text(hw!.comment!, style: context.text.bodyMedium),
            ],
          ),
        ),
      if (day.confirmed && (day.confirmedDescription != null || day.confirmedProblems != null))
        _Row(
          label: 'Батламж',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (day.confirmedProblems != null)
                Text('Бодлого: ${day.confirmedProblems}', style: context.text.bodyMedium),
              if (day.confirmedDescription != null) Text(day.confirmedDescription!, style: context.text.bodyMedium),
              if (day.confirmedBy != null) Text(day.confirmedBy!, style: small),
            ],
          ),
        ),
      if (day.teacherNote != null)
        _Row(
          label: 'Тэмдэглэл',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Icon(AppIcons.stickyNote, size: 14, color: c.brand),
                  ),
                  const SizedBox(width: AppSpace.xs),
                  Expanded(child: Text(day.teacherNote!, style: context.text.bodyMedium)),
                ],
              ),
              if (day.teacherNoteBy != null) Text(day.teacherNoteBy!, style: small),
            ],
          ),
        ),
      if (missed && day.tests.isNotEmpty)
        _Row(
          label: 'Нөхөлт',
          child: madeUp.isEmpty
              ? Text(
                  'Нөхөөгүй',
                  style: context.text.bodyMedium?.copyWith(color: c.warning, fontWeight: FontWeight.w600),
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (final m in madeUp)
                      Row(
                        children: [
                          Icon(m.place.room406 ? AppIcons.doorOpen : AppIcons.repeat, size: 14, color: c.brand),
                          const SizedBox(width: AppSpace.xs),
                          Expanded(child: Text('${shortDay(m.date)}, ${m.label}', style: context.text.bodyMedium)),
                        ],
                      ),
                  ],
                ),
        ),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (day.future && att == null) const _Notice(icon: AppIcons.upcoming, text: 'Хичээл хараахан болоогүй'),
        if (day.movedFrom != null)
          _Notice(icon: AppIcons.upcoming, text: '${shortDay(day.movedFrom!)}-ний хичээлийг зөөсөн'),
        if (!day.own)
          _Notice(
            icon: AppIcons.repeat,
            color: c.info,
            text: 'Тэр өдөр өөрийн анги биш ${day.classroomName} ангид тэмдэглэгдсэн',
          ),
        for (final (i, r) in rows.indexed) ...[if (i > 0) Divider(height: 1, color: c.line), r],
      ],
    );
  }
}

/// Нэг нөхөлтийн дэлгэрэнгүй (огноо, багш, ирц, тест, дүн, тайлбар) — хуанлийн цонх ба нөхөлтийн түүх.
/// Онлайнаар өгсөн тестийн «Хариу харах» нь сурагчийн задаргаа руу (ажилтны хуудас).
class MakeupVisitBody extends StatelessWidget {
  const MakeupVisitBody({super.key, required this.visit, required this.studentId});

  final MakeupHistoryItem visit;
  final String studentId;

  static String _num(double v) => v == v.roundToDouble() ? v.toInt().toString() : formatScore(v);

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final v = visit;
    final small = context.text.bodySmall?.copyWith(color: c.inkDim);
    final at = parseApiInstant(v.createdAt);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Meta(
          style: small,
          items: [
            fullDay(v.date),
            '${v.teacherName} бүртгэсэн${at == null ? '' : ', ${DateMn.time(UbDateTime.fromInstant(at))}'}',
            if (v.homeClassroomName != null) 'өөрийн анги ${shortClass(v.homeClassroomName!)}',
          ],
        ),
        if (v.attendance != null || v.homework != null) ...[
          const SizedBox(height: AppSpace.sm),
          Wrap(
            spacing: AppSpace.md,
            runSpacing: AppSpace.xs,
            children: [
              if (v.attendance != null) AttendanceMarkView(status: v.attendance, lateRange: v.lateRange),
              if (v.homework != null) HomeworkMarkView(status: v.homework),
            ],
          ),
        ],
        const SizedBox(height: AppSpace.sm),
        if (v.tests.isEmpty)
          Text(v.place.room406 ? 'Нөхсөн сэдэв сонгоогүй' : 'Тэр хичээлийн тест бүртгэгдээгүй', style: small)
        else
          for (final t in v.tests)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Wrap(
                spacing: AppSpace.sm,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  if (t.testId == null) Icon(AppIcons.homework, size: 14, color: c.inkDim),
                  Text(t.title, style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                  if (t.source == CoveredSource.planned) Text('төлөвлөгөөгөөр', style: small),
                  if (t.result != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpace.xs),
                      decoration: BoxDecoration(color: c.surfaceSunken, borderRadius: BorderRadius.circular(4)),
                      child: Text(
                        '${_num(t.result!.score)}/${_num(t.result!.max)}',
                        style: context.text.labelMedium?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    )
                  else if (t.testId != null)
                    Text('онлайнаар өгөөгүй', style: small),
                  if (t.testId != null && t.result != null)
                    TextButton(
                      style: TextButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap)),
                      onPressed: () => context.push(
                        '/app/tests/${Uri.encodeComponent(t.testId!)}/results/${Uri.encodeComponent(studentId)}',
                      ),
                      child: const Text('Хариу харах'),
                    ),
                ],
              ),
            ),
        if (v.comment != null) ...[
          const SizedBox(height: AppSpace.sm),
          Container(
            padding: const EdgeInsets.all(AppSpace.sm),
            decoration: BoxDecoration(color: c.surfaceSunken, borderRadius: BorderRadius.circular(AppRadius.sm)),
            child: Text(v.comment!, style: context.text.bodyMedium),
          ),
        ],
      ],
    );
  }
}
