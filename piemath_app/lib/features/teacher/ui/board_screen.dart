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
import 'board_guests.dart';
import 'board_other_info.dart';
import 'board_parts.dart';
import 'board_quiz.dart';
import 'criteria_sheet.dart';
import 'day_pdf_card.dart';
import 'lesson_extras.dart';
import 'presence_beat.dart';
import 'teacher_widgets.dart';

export 'board_card.dart' show OnlineBoxButton;

/// Ирц ба даалгаврын самбар (`/app/teacher/board/:classId?date=`) — вэбийн `Board`-ын дараалал:
/// хичээлийн тэмдэглэл, наалддаг тойм, хэн тэмдэглэсэн, хичээлийн мэдээлэл, шүүлтүүр, сурагчдын карт,
/// «Үлдсэнийг нэг дор», тайлбар (legend) хамгийн доор, ангийн бусад мэдээлэл. Товшилт бүр шууд хадгалагдана.
///
/// Ангидаа орсны дараа өдрийг дотроос нь солино (эзэн 2026-11-14): дээд талын огнооны мөр — өмнөх/дараагийн
/// өдөр, огноо дээр дарж сонгох, «Өнөөдөр». Өдөр бүр өөрийн төлөвтэй ([_BoardDay] огноогоор түлхүүрлэгдэнэ) тул
/// хадгалагдаж буй тэмдэглэгээ, poll, шүүлтүүр өдөр хооронд холилдохгүй.
class BoardScreen extends ConsumerStatefulWidget {
  const BoardScreen({super.key, required this.classId, this.date});

  final String classId;

  /// `YYYY-MM-DD` (UB); null бол өнөөдөр.
  final String? date;

  @override
  ConsumerState<BoardScreen> createState() => _BoardScreenState();
}

class _BoardScreenState extends ConsumerState<BoardScreen> {
  late String _date = widget.date ?? ref.read(teacherTodayProvider).dateKey;

  @override
  Widget build(BuildContext context) => _BoardDay(
    key: ValueKey('board-day:$_date'),
    classId: widget.classId,
    date: _date,
    onDate: (d) {
      if (d != _date) setState(() => _date = d);
    },
  );
}

/// Нэг ангийн нэг өдрийн самбар.
class _BoardDay extends ConsumerStatefulWidget {
  const _BoardDay({super.key, required this.classId, required this.date, required this.onDate});

  final String classId;
  final String date;
  final ValueChanged<String> onDate;

  @override
  ConsumerState<_BoardDay> createState() => _BoardDayState();
}

class _BoardDayState extends ConsumerState<_BoardDay> {
  late final AppLifecycleListener _life;

  late final BoardArgs _args = (classId: widget.classId, date: widget.date);

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
    final today = ref.watch(teacherTodayProvider).dateKey;
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(s.title ?? 'Ирц ба даалгавар', maxLines: 1, overflow: TextOverflow.ellipsis),
            BoardDatePicker(date: _args.date, today: today, onDate: widget.onDate),
          ],
        ),
        actions: [
          ...boardDayArrows(date: _args.date, today: today, onDate: widget.onDate),
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

/// Самбарын огнооны хязгаар: ирэх долоо хоногуудын хичээлийг урьдчилж нээхэд хангалттай.
const boardFutureDays = 60;

bool _canForward(UbDateTime day, UbDateTime now) => day.dayIndex < now.addDays(boardFutureDays).dayIndex;

/// AppBar-ын «‹ ›» — өмнөх/дараагийн өдөр (ангиас гаралгүй).
List<Widget> boardDayArrows({required String date, required String today, required ValueChanged<String> onDate}) {
  final day = parseDateKey(date);
  final now = parseDateKey(today);
  if (day == null || now == null) return const [];
  Widget arrow(IconData icon, String tip, VoidCallback? onTap, String key) => IconButton(
    key: ValueKey(key),
    tooltip: tip,
    constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
    icon: Icon(icon),
    onPressed: onTap,
  );
  return [
    arrow(AppIcons.back, 'Өмнөх өдөр', () => onDate(day.addDays(-1).dateKey), 'board-date-prev'),
    arrow(
      AppIcons.forward,
      'Дараагийн өдөр',
      _canForward(day, now) ? () => onDate(day.addDays(1).dateKey) : null,
      'board-date-next',
    ),
  ];
}

/// AppBar-ын гарчгийн доорх огноо: дарахад хуанли нээгдэнэ; өөр өдөр харж байвал хажууд нь «Өнөөдөр».
class BoardDatePicker extends StatelessWidget {
  const BoardDatePicker({super.key, required this.date, required this.today, required this.onDate});

  /// Харж буй өдөр ба өнөөдөр (`YYYY-MM-DD`, UB).
  final String date;
  final String today;
  final ValueChanged<String> onDate;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final day = parseDateKey(date);
    final now = parseDateKey(today);
    if (day == null || now == null) return const SizedBox.shrink();
    final isToday = date == today;
    final last = now.addDays(boardFutureDays);
    final small = context.text.bodySmall;

    Future<void> pick() async {
      final picked = await showDatePicker(
        context: context,
        initialDate: DateTime(day.year, day.month, day.day),
        currentDate: DateTime(now.year, now.month, now.day),
        firstDate: DateTime(2024),
        lastDate: DateTime(last.year, last.month, last.day),
        helpText: 'Өдөр сонгох',
      );
      if (picked != null) onDate(UbDateTime(picked.year, picked.month, picked.day).dateKey);
    }

    return Row(
      children: [
        Flexible(
          child: Semantics(
            button: true,
            label: '${DateMn.longWithWeekday(day)}, өдөр сонгох',
            excludeSemantics: true,
            child: InkWell(
              key: const ValueKey('board-date-pick'),
              onTap: pick,
              borderRadius: BorderRadius.circular(AppRadius.sm),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Flexible(
                      child: Text(
                        DateMn.longWithWeekday(day),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: small?.copyWith(color: isToday ? c.inkDim : c.brand, fontWeight: FontWeight.w600),
                      ),
                    ),
                    const SizedBox(width: 2),
                    Icon(AppIcons.expand, size: 14, color: isToday ? c.inkDim : c.brand),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (!isToday) ...[
          const SizedBox(width: AppSpace.sm),
          InkWell(
            key: const ValueKey('board-date-today'),
            onTap: () => onDate(today),
            borderRadius: BorderRadius.circular(AppRadius.pill),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: 2),
              child: Text(
                'Өнөөдөр',
                style: small?.copyWith(color: c.brand, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ],
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
    final quizScored = homework ? ref.watch(quizScoredProvider(args)).ids : const <String>{};
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
                      quiz: quizScored,
                    ).apply(filter, order),
                  ),
                ),
              )
              .ids;
    // Онооны талбаруудын «Дараах» дараалал — жагсаалтад харагдаж буйгаар.
    if (homework) ref.read(quizFocusChainProvider(args)).order = shown;
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
              // Шалгалтаар даалгавар шалгах (эзэн 2026-11-08) — шүүлтүүрийн доор.
              if (homework) ...[QuizBar(args: args, studentIds: order), const SizedBox(height: AppSpace.sm)],
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
              // Нөхөлт: өөр ангиас нөхөж суусан сурагчид, нэмэх товч (эзэн 2026-11-08).
              gap,
              GuestSection(
                hostId: args.classId,
                hostName: p.classroom.name,
                date: args.date,
                today: today.dateKey,
                homework: homework,
                wide: wide,
              ),
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
