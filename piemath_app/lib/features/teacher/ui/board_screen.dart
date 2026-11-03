import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/format/person_name.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../application/board_controller.dart';
import '../application/staff_providers.dart';
import '../application/teacher_providers.dart';
import '../domain/board_logic.dart';
import 'board_card.dart';
import 'board_other_info.dart';
import 'board_parts.dart';
import 'criteria_sheet.dart';
import 'day_pdf_card.dart';
import 'lesson_extras.dart';
import 'presence_beat.dart';
import 'teacher_widgets.dart';

export 'board_card.dart' show OnlineBoxButton;

/// Ирц ба даалгаврын самбар (`/app/teacher/board/:classId?date=`) — вэбийн `Board`-ын дараалал:
/// хичээлийн тэмдэглэл, наалддаг тойм, хэн тэмдэглэсэн, хичээлийн мэдээлэл, шүүлтүүр, сурагчдын карт,
/// «Үлдсэнийг нэг дор», тайлбар (legend) хамгийн доор, ангийн бусад мэдээлэл. Товшилт бүр шууд хадгалагдана.
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
    // Товшилт бүрт бүх дэлгэц дахин зурагдахгүй — зөвхөн ачааллын төлөв, гарчиг.
    final s = ref.watch(
      boardControllerProvider(_args).select(
        (s) => (
          status: s.status,
          error: s.loadError,
          title: s.payload?.classroom.name,
          criteria: s.payload?.canEditCriteria ?? false,
        ),
      ),
    );
    final ctl = ref.read(boardControllerProvider(_args).notifier);
    final day = parseDateKey(_args.date);
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(s.title ?? 'Ирц ба даалгавар'),
            if (day != null)
              Text(DateMn.longWithWeekday(day), style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
          ],
        ),
        actions: [
          // Эрсдэлийн шалгуур — зөвхөн Багш+ / Админ (сервер `canEditCriteria`).
          if (s.criteria)
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
              BoardLoad.error => ErrorState(message: s.error ?? AppStrings.genericError, onRetry: ctl.reload),
              BoardLoad.ready => RefreshIndicator(
                onRefresh: ctl.poll,
                child: _BoardBody(args: _args),
              ),
            },
          ),
        ],
      ),
    );
  }
}

/// Шүүлтүүрийн үр дүн — утгаар харьцуулна (жагсаалт өөрчлөгдөөгүй бол дахин зурахгүй).
@immutable
class _Ids {
  const _Ids(this.ids);

  final List<String> ids;

  @override
  bool operator ==(Object other) => other is _Ids && listEquals(other.ids, ids);

  @override
  int get hashCode => Object.hashAll(ids);
}

class _BoardBody extends ConsumerStatefulWidget {
  const _BoardBody({required this.args});

  final BoardArgs args;

  @override
  ConsumerState<_BoardBody> createState() => _BoardBodyState();
}

class _BoardBodyState extends ConsumerState<_BoardBody> {
  BoardFilter? _filter;

  BoardArgs get args => widget.args;

  void _setFilter(BoardFilter? f) => setState(() => _filter = f);

  @override
  Widget build(BuildContext context) {
    final board = boardControllerProvider(args);
    final p = ref.watch(board.select((s) => s.payload))!;
    final c = context.colors;
    final homework = !p.isOnline;
    // Нэрээр (овгоор биш) эрэмбэлж «Б. Нэр»; ижил нэр, ижил овгийн үсэгтэй бол овог бүтнээр (эзэн 2026-10-18).
    final students = byFirstName(p.students);
    final names = rosterNames([
      for (final st in students) (id: st.id, firstName: st.firstName, lastName: st.lastName, role: null),
    ]);
    final order = [for (final st in students) st.id];
    final today = ref.watch(teacherTodayProvider);
    final day = (classId: args.classId, date: args.date);
    // Нөхөх хичээлийн төлөв зөвхөн өнгөрсөн өдөр; онлайн гэрийн даалгаврын оноо зөвхөн танхимын анги (вэбтэй ижил).
    final past = args.date.compareTo(today.dateKey) < 0;
    final marks = homework ? ref.watch(onlineMarksProvider(day)).value : null;
    final hasOnline = homework && (marks?.hasTests ?? false);
    final onlineIds = {
      for (final id in order)
        if (marks?.students.containsKey(id) ?? false) id,
    };
    final filter = _filter;
    final shown = filter == null
        ? order
        : ref
              .watch(
                board.select(
                  (s) => _Ids(
                    BoardFilterData(
                      recs: s.recs,
                      risk: s.risk,
                      sent: s.sent.toSet(),
                      online: onlineIds,
                    ).apply(filter, order),
                  ),
                ),
              )
              .ids;
    final wide = isBoardWide(context);
    final upcoming = lessonUpcoming(args.date, today.dateKey, today.hour * 60 + today.minute, p.lessons);
    const gutter = EdgeInsets.symmetric(horizontal: AppSpace.gutter);
    const gap = SizedBox(height: AppSpace.md);

    final List<Widget> slivers;
    if (p.holiday != null || p.students.isEmpty) {
      slivers = [
        SliverPadding(
          padding: gutter,
          sliver: SliverToBoxAdapter(
            child: p.holiday != null
                ? AppCard(
                    child: EmptyState(icon: AppIcons.calendarOff, title: 'Амралтын өдөр', message: p.holiday),
                  )
                : const AppCard(
                    child: EmptyState(
                      icon: AppIcons.students,
                      title: 'Энэ ангид сурагч алга',
                      message: 'Сурагчдыг «Сурагчид» хэсгээс ангид нэмнэ',
                    ),
                  ),
          ),
        ),
      ];
    } else {
      slivers = [
        // Толгойн доор наалддаг тойм (вэбийн `sticky` SummaryBar).
        PinnedHeaderSliver(
          child: ColoredBox(
            color: c.bg,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.xs, AppSpace.gutter, AppSpace.xs),
              child: BoardSummaryBar(args: args, wide: wide, online: hasOnline ? onlineIds.length : null),
            ),
          ),
        ),
        SliverPadding(
          padding: gutter,
          sliver: SliverList.list(
            children: [
              _SaveError(args: args),
              const SizedBox(height: AppSpace.sm),
              BoardRecordedBy(args: args),
              gap,
              BoardLessonInfo(
                topic: p.lessons
                    .map((l) => l.topic)
                    .firstWhere((t) => t != null && t.trim().isNotEmpty, orElse: () => null),
                homework: homework,
                marks: marks,
                studentIds: order,
              ),
              gap,
              BoardFilters(
                args: args,
                filter: filter,
                onFilter: _setFilter,
                online: onlineIds,
                hasOnline: hasOnline,
                wide: wide,
              ),
              const SizedBox(height: AppSpace.sm),
              if (upcoming) ...[const BoardUpcomingNote(), const SizedBox(height: AppSpace.sm)],
            ],
          ),
        ),
        if (shown.isEmpty)
          SliverPadding(
            padding: gutter,
            sliver: SliverToBoxAdapter(child: _NoMatch(onReset: () => _setFilter(null))),
          )
        else
          SliverPadding(
            padding: gutter,
            sliver: SliverList.builder(
              itemCount: shown.length,
              itemBuilder: (context, i) {
                final id = shown[i];
                return Padding(
                  key: ValueKey(id),
                  padding: const EdgeInsets.only(bottom: AppSpace.sm),
                  child: BoardStudentCard(
                    args: args,
                    className: p.classroom.name,
                    studentId: id,
                    index: i + 1,
                    name: names[id] ?? id,
                    homework: homework,
                    onlineTests: hasOnline,
                    past: past,
                    wide: wide,
                  ),
                );
              },
            ),
          ),
        SliverPadding(
          padding: gutter,
          sliver: SliverList.list(
            children: [
              const SizedBox(height: AppSpace.xs),
              BoardBulkActions(args: args, wide: wide),
              if (p.isOnline) ...[gap, BoardOnlineClassLink(classId: p.classroom.id)],
              const SizedBox(height: AppSpace.lg),
              BoardLegend(args: args, onlineTests: hasOnline, past: past),
              const SizedBox(height: AppSpace.lg),
              DismissalCard(classId: args.classId, date: args.date),
              const SizedBox(height: AppSpace.sm),
              DayPdfCard(classId: args.classId, date: args.date),
              const SizedBox(height: AppSpace.sm),
              BoardOtherInfo(classId: args.classId, date: args.date),
            ],
          ),
        ),
      ];
    }

    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 0),
          sliver: SliverList.list(
            children: [
              LessonMeta(lessons: p.lessons, showTopic: false),
              const SizedBox(height: AppSpace.sm),
              LessonNotesCard(date: args.date, lessons: p.lessons),
              const SizedBox(height: AppSpace.sm),
            ],
          ),
        ),
        ...slivers,
        const SliverToBoxAdapter(child: SizedBox(height: AppSpace.xxl)),
      ],
    );
  }
}

/// Хадгалалт амжилтгүй бол серверийн тайлбар (тоймд «Хадгалагдсангүй»).
class _SaveError extends ConsumerWidget {
  const _SaveError({required this.args});

  final BoardArgs args;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final error = ref.watch(boardControllerProvider(args).select((s) => s.saveError));
    if (error == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: AppSpace.xs),
      child: Text(error, style: context.text.bodySmall?.copyWith(color: context.colors.error)),
    );
  }
}

/// Шүүлтүүрт тохирох сурагч алга.
class _NoMatch extends StatelessWidget {
  const _NoMatch({required this.onReset});

  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return DashedBox(
      radius: AppRadius.md,
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.xl),
      child: Column(
        children: [
          Text(
            'Шүүлтүүрт тохирох сурагч алга',
            textAlign: TextAlign.center,
            style: context.text.bodyMedium?.copyWith(color: c.inkDim),
          ),
          const SizedBox(height: AppSpace.sm),
          OutlinedButton(
            style: OutlinedButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
            onPressed: onReset,
            child: const Text('Бүх сурагчийг харах'),
          ),
        ],
      ),
    );
  }
}
