import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/format/person_name.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/marks/marks.dart';
import '../application/board_controller.dart';
import '../application/teacher_providers.dart';
import '../data/teacher_models.dart';
import '../domain/board_logic.dart';
import 'board_note_sheet.dart';
import 'criteria_sheet.dart';
import 'lesson_extras.dart';
import 'presence_beat.dart';
import 'teacher_widgets.dart';

/// Ирц ба даалгаврын самбар (`/app/teacher/board/:classId?date=`). Товшилт бүр шууд хадгалагдана,
/// «Бүгд ирсэн» жагсаалтын ДООР тусдаа, тайлбар (legend) хамгийн доор.
class BoardScreen extends ConsumerStatefulWidget {
  const BoardScreen({super.key, required this.classId, this.date});

  final String classId;

  /// `YYYY-MM-DD` (UB); null бол өнөөдөр.
  final String? date;

  @override
  ConsumerState<BoardScreen> createState() => _BoardScreenState();
}

class _BoardScreenState extends ConsumerState<BoardScreen> {
  late final AppLifecycleListener _life;

  late final BoardArgs _args = (classId: widget.classId, date: widget.date ?? ref.read(teacherTodayProvider).dateKey);

  @override
  void initState() {
    super.initState();
    // Апп ар талд байхад poll хийхгүй (гэрээ §2.2).
    _life = AppLifecycleListener(
      onStateChange: (s) => ref.read(boardControllerProvider(_args).notifier).setActive(s == AppLifecycleState.resumed),
    );
  }

  @override
  void dispose() {
    _life.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(boardControllerProvider(_args));
    final ctl = ref.read(boardControllerProvider(_args).notifier);
    final day = parseDateKey(_args.date);
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(s.payload?.classroom.name ?? 'Ирц ба даалгавар'),
            if (day != null)
              Text(DateMn.longWithWeekday(day), style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
          ],
        ),
        actions: [
          // Эрсдэлийн шалгуур — зөвхөн Багш+ / Админ (сервер `canEditCriteria`).
          if (s.payload?.canEditCriteria ?? false)
            IconButton(
              tooltip: 'Эрсдэлийн шалгуур',
              constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
              icon: const Icon(AppIcons.slidersHorizontal),
              onPressed: () async {
                final saved = await CriteriaSheet.open(context, classId: widget.classId);
                if (saved) await ctl.poll();
              },
            ),
        ],
      ),
      body: Column(
        children: [
          PresenceBeat(classId: _args.classId, date: _args.date),
          Expanded(
            child: switch (s.status) {
              BoardLoad.loading => const LoadingState(cards: 4),
              BoardLoad.error => ErrorState(message: s.loadError ?? AppStrings.genericError, onRetry: ctl.reload),
              BoardLoad.ready => RefreshIndicator(
                onRefresh: ctl.poll,
                child: _BoardBody(args: _args, state: s),
              ),
            },
          ),
        ],
      ),
    );
  }
}

class _BoardBody extends ConsumerWidget {
  const _BoardBody({required this.args, required this.state});

  final BoardArgs args;
  final BoardState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = state.payload!;
    final ctl = ref.read(boardControllerProvider(args).notifier);
    final names = rosterNames([
      for (final st in p.students) (id: st.id, firstName: st.firstName, lastName: st.lastName, role: null),
    ]);
    final c = context.colors;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
      children: [
        LessonMeta(lessons: p.lessons, extra: ['${p.students.length} сурагч']),
        const SizedBox(height: AppSpace.xs),
        Align(
          alignment: Alignment.centerLeft,
          child: SaveStatus(pending: state.pending, savedAt: state.savedAt, error: state.saveError),
        ),
        if (state.saveError != null) ...[
          const SizedBox(height: AppSpace.sm),
          Text(state.saveError!, style: context.text.bodySmall?.copyWith(color: c.error)),
        ],
        const SizedBox(height: AppSpace.md),
        if (p.holiday != null)
          AppCard(
            child: EmptyState(icon: AppIcons.calendarOff, title: 'Амралтын өдөр', message: p.holiday),
          )
        else if (p.students.isEmpty)
          const AppCard(
            child: EmptyState(
              icon: AppIcons.students,
              title: 'Энэ ангид сурагч алга',
              message: 'Сурагчдыг «Сурагчид» хэсгээс ангид нэмнэ',
            ),
          )
        else ...[
          _Counts(state: state),
          const SizedBox(height: AppSpace.md),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (final (i, st) in p.students.indexed) ...[
                  if (i > 0) Divider(height: 1, color: c.line),
                  _StudentRow(
                    args: args,
                    studentId: st.id,
                    name: names[st.id] ?? st.firstName,
                    rec: state.recs[st.id] ?? DayRec.empty,
                    homework: state.homework,
                    risk: state.risk[st.id] ?? const [],
                    sent: state.sent.contains(st.id),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpace.lg),
          _BulkActions(state: state, ctl: ctl),
          if (p.isOnline) ...[
            const SizedBox(height: AppSpace.md),
            AppCard(
              onTap: () => context.push('/app/classes/${Uri.encodeComponent(p.classroom.id)}/assignments'),
              child: Row(
                children: [
                  Icon(AppIcons.laptop, color: c.brand),
                  const SizedBox(width: AppSpace.md),
                  const Expanded(child: Text('Онлайн даалгавар шалгах')),
                  Icon(AppIcons.forward, color: c.inkDim),
                ],
              ),
            ),
          ],
          const SizedBox(height: AppSpace.md),
          LessonNotesCard(date: args.date, lessons: p.lessons),
          const SizedBox(height: AppSpace.sm),
          DismissalCard(classId: args.classId, date: args.date),
          if (_recorders(state).isNotEmpty) ...[
            const SizedBox(height: AppSpace.md),
            Text('Хэн тэмдэглэсэн', style: context.text.labelMedium?.copyWith(color: c.inkDim)),
            const SizedBox(height: AppSpace.xs),
            for (final line in _recorders(state)) Text(line, style: context.text.bodySmall),
          ],
          const SizedBox(height: AppSpace.lg),
          MarkLegend(
            items: [
              for (final a in AttendanceStatus.values) attendanceMeta(a),
              if (state.homework)
                for (final h in HomeworkStatus.values) homeworkMeta(h),
            ],
          ),
        ],
      ],
    );
  }

  List<String> _recorders(BoardState s) {
    final r = s.recordedBy;
    if (r == null) return const [];
    String fmt(Recorder x) {
      final at = parseApiInstant(x.at);
      return at == null ? x.name : '${x.name}, ${DateMn.time(UbDateTime.fromInstant(at))}';
    }

    return [
      if (r.attendance.isNotEmpty) 'Ирц: ${r.attendance.map(fmt).join(', ')}',
      if (r.homework.isNotEmpty) 'Даалгавар: ${r.homework.map(fmt).join(', ')}',
    ];
  }
}

/// Төлөв бүрийн тоо (Ирсэн ба Хоцорсон тусдаа).
class _Counts extends StatelessWidget {
  const _Counts({required this.state});

  final BoardState state;

  @override
  Widget build(BuildContext context) {
    final k = state.counts;
    Widget item(MarkMeta m, int n) => Semantics(
      label: '${m.label} $n',
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          MarkIcon(m.glyph, color: m.tone.color(context.colors), size: 16),
          const SizedBox(width: AppSpace.xs),
          Text('$n', style: context.text.labelLarge),
        ],
      ),
    );
    return Wrap(
      spacing: AppSpace.lg,
      runSpacing: AppSpace.sm,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        for (final a in AttendanceStatus.values) item(attendanceMeta(a), k.attendance[a]!),
        item(AttendanceMarkView.noneMeta, k.attUnmarked),
      ],
    );
  }
}

class _StudentRow extends ConsumerWidget {
  const _StudentRow({
    required this.args,
    required this.studentId,
    required this.name,
    required this.rec,
    required this.homework,
    required this.risk,
    required this.sent,
  });

  final BoardArgs args;
  final String studentId;
  final String name;
  final DayRec rec;
  final bool homework;
  final List<RiskFlag> risk;
  final bool sent;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ctl = ref.read(boardControllerProvider(args).notifier);
    final c = context.colors;
    final detail = needsDetail(rec, homework: homework);
    final sub = <Object?>[
      if (rec.att == AttendanceStatus.late && rec.lateRange != null) 'Хоцорсон ${lateRangeShort(rec.lateRange!)}',
      if (rec.attNote.trim().isNotEmpty) rec.attNote.trim(),
      if (rec.hwNote.trim().isNotEmpty) rec.hwNote.trim(),
    ];
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.sm, AppSpace.xs, AppSpace.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Flexible(
                child: Text(name, style: context.text.titleSmall, overflow: TextOverflow.ellipsis),
              ),
              if (risk.isNotEmpty) ...[
                const SizedBox(width: AppSpace.xs),
                Tooltip(
                  message: risk.map((r) => r.label).join(', '),
                  child: Semantics(
                    label: 'Анхаарах: ${risk.map((r) => r.label).join(', ')}',
                    child: Icon(AppIcons.warning, size: 16, color: c.error),
                  ),
                ),
              ],
              if (sent) ...[
                const SizedBox(width: AppSpace.xs),
                Tooltip(
                  message: 'Даалгавраа илгээсэн',
                  child: Icon(AppIcons.send, size: 16, color: c.brand, semanticLabel: 'Даалгавраа илгээсэн'),
                ),
              ],
              const Spacer(),
              IconButton(
                key: ValueKey('note-$studentId'),
                tooltip: rec.hasNote ? 'Тэмдэглэл нээх' : 'Тэмдэглэл бичих',
                constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
                icon: Icon(
                  rec.hasNote ? AppIcons.stickyNote : AppIcons.overflow,
                  color: detail || rec.hasNote ? c.brand : c.inkDim,
                ),
                onPressed: () => BoardNoteSheet.open(context, args: args, studentId: studentId, name: name),
              ),
            ],
          ),
          if (sub.isNotEmpty) ...[
            Meta(
              items: sub,
              style: context.text.bodySmall?.copyWith(color: c.inkDim),
            ),
            const SizedBox(height: AppSpace.xs),
          ],
          Wrap(
            spacing: AppSpace.lg,
            runSpacing: AppSpace.sm,
            children: [
              _Group(
                children: [
                  for (final a in AttendanceStatus.values)
                    MarkButton(
                      key: ValueKey('att-$studentId-${a.name}'),
                      meta: attendanceMeta(a),
                      selected: rec.att == a,
                      label: '$name, ${attendanceMeta(a).label}',
                      onTap: () => ctl.setAttendance(studentId, rec.att == a ? null : a),
                    ),
                ],
              ),
              if (homework)
                _Group(
                  children: [
                    for (final h in HomeworkStatus.values)
                      MarkButton(
                        key: ValueKey('hw-$studentId-${h.name}'),
                        meta: homeworkMeta(h),
                        selected: rec.hw == h,
                        label: '$name, даалгавар ${homeworkMeta(h).label}',
                        onTap: () => ctl.setHomework(studentId, rec.hw == h ? null : h),
                      ),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Group extends StatelessWidget {
  const _Group({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      for (final (i, w) in children.indexed) ...[if (i > 0) const SizedBox(width: AppSpace.xs), w],
    ],
  );
}

/// «Үлдсэнийг нэг дор» — жагсаалтын ДООР, гараар тэмдэглэснийг хөндөхгүй.
class _BulkActions extends StatelessWidget {
  const _BulkActions({required this.state, required this.ctl});

  final BoardState state;
  final BoardController ctl;

  @override
  Widget build(BuildContext context) {
    final present = bulkPresentCandidates(state.studentIds, state.recs).length;
    final done = bulkDoneCandidates(state.studentIds, state.recs).length;
    final skipped = bulkDoneSkipped(state.studentIds, state.recs);
    return AppCard(
      padding: const EdgeInsets.all(AppSpace.md),
      semanticLabel: 'Үлдсэнийг нэг дор тэмдэглэх',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Үлдсэнийг нэг дор', style: context.text.titleSmall),
          Text('Гараар тэмдэглэснийг хөндөхгүй', style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
          const SizedBox(height: AppSpace.md),
          _BulkButton(
            meta: attendanceMeta(AttendanceStatus.present),
            label: 'Бүгд ирсэн',
            count: present,
            undo: state.bulkAtt.length,
            busy: state.bulkBusy,
            onApply: ctl.markAllPresent,
            onUndo: ctl.undoAllPresent,
          ),
          if (state.homework) ...[
            const SizedBox(height: AppSpace.sm),
            _BulkButton(
              meta: homeworkMeta(HomeworkStatus.done),
              label: 'Бүгд хийсэн',
              count: done,
              undo: state.bulkHw.length,
              busy: state.bulkBusy,
              onApply: ctl.markAllDone,
              onUndo: ctl.undoAllDone,
            ),
            if (skipped > 0) ...[
              const SizedBox(height: AppSpace.sm),
              Text(
                'Ирээгүй, ирц тэмдэглээгүй $skipped сурагчийн даалгаврыг алгасна',
                style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

class _BulkButton extends StatelessWidget {
  const _BulkButton({
    required this.meta,
    required this.label,
    required this.count,
    required this.undo,
    required this.busy,
    required this.onApply,
    required this.onUndo,
  });

  final MarkMeta meta;
  final String label;
  final int count;
  final int undo;
  final bool busy;
  final Future<void> Function() onApply;
  final Future<void> Function() onUndo;

  @override
  Widget build(BuildContext context) {
    const size = Size.fromHeight(teacherTap);
    if (undo > 0) {
      return OutlinedButton.icon(
        style: OutlinedButton.styleFrom(minimumSize: size),
        onPressed: busy ? null : onUndo,
        icon: const Icon(AppIcons.restart, size: 18),
        label: Text('Буцаах ($undo)', semanticsLabel: '$label товчоор тэмдэглэсэн $undo сурагчийг буцаах'),
      );
    }
    return OutlinedButton.icon(
      style: OutlinedButton.styleFrom(minimumSize: size),
      onPressed: count == 0 || busy ? null : onApply,
      icon: MarkIcon(meta.glyph, color: count == 0 ? context.colors.inkDim : meta.tone.color(context.colors), size: 18),
      label: Text('$label ($count)'),
    );
  }
}
