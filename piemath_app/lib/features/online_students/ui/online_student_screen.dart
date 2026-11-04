import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../results/data/results_models.dart' show fmtScore;
import '../../results/domain/results_logic.dart' show correctTone;
import '../../results/ui/results_widgets.dart' show PercentBar, PercentText, SliverSection, toneOfCorrect;
import '../../teacher/application/teacher_providers.dart' show errorText;
import '../application/online_providers.dart';
import '../data/online_models.dart';
import '../domain/online_logic.dart';
import 'online_students_screen.dart' show EngagementChip, PassChip;

/// Нэг онлайн сурагч (`/app/online/:id`, вэбийн `OnlineStudentDetailClient`).
///
/// Утсанд: толгой + 4 тоо, дараа нь «Бүлгийн явц», «Сүүлийн тестүүд», «Идэвх» (12 долоо хоногийн жижиг
/// зураг + 30 хоногийн тэнхлэг), «Сул тал», «Эрхийн түүх». Багш зөвхөн харна; Багш+, Админ тест оноож,
/// оролдлогын тэмдэглэгээ засна (сервер ирүүлсэн үед).
class OnlineStudentScreen extends ConsumerWidget {
  const OnlineStudentScreen({super.key, required this.studentId, this.name});

  final String studentId;
  final String? name;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final access = ref.watch(onlineAccessProvider);
    return Scaffold(
      appBar: AppBar(title: Text(name?.isNotEmpty ?? false ? name! : 'Онлайн сурагч')),
      body: access.canView
          ? OnlineStudentView(studentId: studentId)
          : const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden),
    );
  }
}

class OnlineStudentView extends ConsumerStatefulWidget {
  const OnlineStudentView({super.key, required this.studentId});

  final String studentId;

  @override
  ConsumerState<OnlineStudentView> createState() => _OnlineStudentViewState();
}

class _OnlineStudentViewState extends ConsumerState<OnlineStudentView> {
  static const _timelinePreview = 20;
  bool _allTimeline = false;

  /// Засварласан оролдлогын тэмдэглэгээ (optimistic): attemptId → selfState.
  final _edited = <String, String>{};

  void _snack(String text) => ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text)));

  Future<void> _assignTest() async {
    final List<TestPick> tests;
    try {
      tests = await ref.read(onlineTestPicksProvider.future);
    } catch (e) {
      if (mounted) _snack(errorText(e, 'Тестийн жагсаалт ачаалж чадсангүй'));
      return;
    }
    if (!mounted) return;
    final ok = await showFormSheet<bool>(
      context,
      title: 'Тест оноох',
      submitLabel: 'Оноох',
      fields: [
        FormSelectField<String>(
          name: 'test',
          label: 'Тест',
          icon: AppIcons.tests,
          required: true,
          options: [for (final t in tests) SelectOption(t.id, t.label)],
        ),
        const FormTextField(name: 'note', label: 'Тэмдэглэл (заавал биш)', maxLines: 2),
      ],
      onSubmit: (v) async {
        await ref
            .read(onlineRepositoryProvider)
            .assignTest(widget.studentId, testId: v.get<String>('test')!, note: v.text('note'));
        return true;
      },
    );
    if (ok == true && mounted) _snack('Тест амжилттай оноогдлоо');
  }

  Future<void> _editAttempt(TimelineAttempt a) async {
    final id = a.attemptId;
    if (id == null) return;
    final current = _edited[id] ?? a.selfState;
    final picked = await showSelectSheet<String>(
      context,
      title: '${a.chapterTitle}, тэмдэглэгээ засах',
      selected: current,
      options: [for (final (v, l) in selfStateOptions) SelectOption(v, l)],
    );
    if (picked == null || picked.value == current || !mounted) return;
    setState(() => _edited[id] = picked.value);
    try {
      await ref.read(onlineRepositoryProvider).adjustAttempt(widget.studentId, id, selfState: picked.value);
      if (mounted) _snack('Тэмдэглэгээ засагдлаа');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        if (current == null) {
          _edited.remove(id);
        } else {
          _edited[id] = current;
        }
      });
      _snack(errorText(e, 'Засаж чадсангүй'));
    }
  }

  Future<void> _refresh() async {
    _edited.clear();
    ref.invalidate(onlineTimelineProvider(widget.studentId));
    await ref.refresh(onlineDetailProvider(widget.studentId).future).then((_) {}, onError: (_) {});
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(onlineDetailProvider(widget.studentId));
    return async.when(
      skipLoadingOnRefresh: false,
      skipLoadingOnReload: true,
      loading: () => const LoadingState(cards: 4),
      error: (e, _) => ErrorState(
        message: errorText(e, 'Сурагчийн мэдээлэл ачаалж чадсангүй'),
        onRetry: () => ref.invalidate(onlineDetailProvider(widget.studentId)),
      ),
      data: (d) => RefreshIndicator(
        onRefresh: _refresh,
        child: CustomScrollView(physics: const AlwaysScrollableScrollPhysics(), slivers: _slivers(context, d)),
      ),
    );
  }

  List<Widget> _slivers(BuildContext context, OnlineDetail d) {
    final access = ref.watch(onlineAccessProvider);
    final now = ref.watch(onlineNowProvider);
    final today = UbDateTime.fromInstant(now);
    final lastDay = lastActiveDay(d.days, today);
    final engagement = engagementSince(lastDay, today);
    final timeline = ref.watch(onlineTimelineProvider(widget.studentId));
    final dim = context.text.bodySmall?.copyWith(color: context.colors.inkDim);
    const pad = EdgeInsets.symmetric(horizontal: AppSpace.gutter);
    return [
      SliverToBoxAdapter(
        child: DetailHeader(
          title: d.name,
          subtitle: <Object?>[d.studentCode ?? 'Код тодорхойгүй', if (d.grade != null) '${d.grade}-р анги', d.school],
          avatar: const DetailAvatar(icon: AppIcons.laptop),
          chips: [
            EngagementChip(level: engagement),
            PassChip(pass: d.activePass, now: now),
            if (d.activePass?.expiresAt case final exp?)
              MetaChip(label: '${DateMn.numeric(UbDateTime.fromInstant(exp))} хүртэл', icon: AppIcons.calendarCheck),
            MetaChip(label: 'Сүүлд: ${relativeDay(lastDay, today)}', icon: AppIcons.time),
          ],
          primary: access.canEdit
              ? DetailAction(label: 'Тест оноох', icon: AppIcons.add, onPressed: _assignTest)
              : null,
        ),
      ),
      SliverPadding(
        padding: pad,
        sliver: SliverToBoxAdapter(
          child: StatRow(
            tiles: [
              StatTile(
                label: 'Стрийк',
                value: '${d.currentStreak}',
                icon: AppIcons.flame,
                hint: 'хоног, дээд нь ${d.longestStreak}',
              ),
              StatTile(label: 'Бодлого', value: '${d.totalAttempts}', hint: 'нийт бодсон'),
              StatTile(label: 'Амжилт', value: d.overallSuccess == null ? '—' : '${d.overallSuccess}%', hint: 'нийт'),
              StatTile(label: 'Идэвхтэй өдөр', value: '${d.totalActiveDays}', hint: 'энэ жил'),
            ],
          ),
        ),
      ),
      if (!access.canEdit)
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, 0),
          sliver: SliverToBoxAdapter(
            child: Row(
              children: [
                Icon(AppIcons.show, size: 16, color: context.colors.inkDim),
                const SizedBox(width: AppSpace.sm),
                Expanded(child: Text('Та зөвхөн харах эрхтэй. Засах бол Багш+ эсвэл админд хандана уу', style: dim)),
              ],
            ),
          ),
        ),
      // ───────── Явц ─────────
      const SliverSection(title: 'Бүлгийн явц'),
      if (d.chapters.isEmpty)
        SliverPadding(
          padding: pad,
          sliver: SliverToBoxAdapter(child: Text('Одоогоор бүлэг рүү орж үзээгүй байна', style: dim)),
        )
      else
        SliverPadding(
          padding: pad,
          sliver: SliverList.separated(
            itemCount: d.chapters.length,
            separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
            itemBuilder: (context, i) => _ChapterCard(chapter: d.chapters[i]),
          ),
        ),
      // ───────── Тестүүд ─────────
      SliverSection(title: 'Сүүлийн тестүүд${d.tests.isEmpty ? '' : ' (${d.tests.length})'}'),
      if (d.tests.isEmpty)
        SliverPadding(
          padding: pad,
          sliver: SliverToBoxAdapter(child: Text('Тест өгч байгаагүй байна', style: dim)),
        )
      else
        SliverPadding(
          padding: pad,
          sliver: SliverList.separated(
            itemCount: d.tests.length,
            separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
            itemBuilder: (context, i) => _TestCard(test: d.tests[i]),
          ),
        ),
      // ───────── Идэвх ─────────
      const SliverSection(title: 'Идэвх'),
      SliverPadding(
        padding: pad,
        sliver: SliverToBoxAdapter(child: ActivityWeeks(weeks: activityWeeks(d.days, today))),
      ),
      ..._timelineSlivers(context, timeline, access.canEdit, dim),
      // ───────── Сул тал ─────────
      const SliverSection(title: 'Сул тал'),
      SliverPadding(
        padding: pad,
        sliver: SliverToBoxAdapter(
          child: d.weakTopics.isEmpty
              ? Text('Одоогоор мэдээлэл хангалтгүй байна', style: dim)
              : Wrap(
                  spacing: AppSpace.sm,
                  runSpacing: AppSpace.sm,
                  children: [
                    for (final t in d.weakTopics.take(8))
                      Tooltip(
                        message: '${t.attempts} бодлого',
                        child: MetaChip(
                          label: '${t.tag} ${t.successRate}%',
                          tone: toneOfCorrect(correctTone(t.successRate)),
                        ),
                      ),
                  ],
                ),
        ),
      ),
      if (d.passHistory.length > 1) ...[
        SliverSection(title: 'Эрхийн түүх (${d.passHistory.length})'),
        SliverPadding(
          padding: pad,
          sliver: SliverList.builder(
            itemCount: d.passHistory.length,
            itemBuilder: (context, i) {
              final p = d.passHistory[i];
              String f(DateTime? t) => t == null ? '—' : DateMn.numeric(UbDateTime.fromInstant(t));
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
                child: Row(
                  children: [
                    Expanded(child: Text(p.name, style: context.text.bodyMedium)),
                    Text('${f(p.startsAt)} – ${f(p.expiresAt)}', style: dim),
                  ],
                ),
              );
            },
          ),
        ),
      ],
      const SliverPadding(padding: EdgeInsets.only(bottom: AppSpace.xxl)),
    ];
  }

  List<Widget> _timelineSlivers(
    BuildContext context,
    AsyncValue<List<TimelineItem>> async,
    bool canEdit,
    TextStyle? dim,
  ) {
    const pad = EdgeInsets.symmetric(horizontal: AppSpace.gutter);
    Widget box(Widget w) => SliverPadding(
      padding: pad,
      sliver: SliverToBoxAdapter(child: w),
    );
    const header = SliverSection(title: 'Сүүлийн 30 хоног');
    if (async.hasError && !async.hasValue) {
      return [
        header,
        box(
          Row(
            children: [
              Expanded(child: Text(errorText(async.error!, 'Идэвхийг ачаалж чадсангүй'), style: dim)),
              TextButton(
                style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: () => ref.invalidate(onlineTimelineProvider(widget.studentId)),
                child: const Text(AppStrings.retry),
              ),
            ],
          ),
        ),
      ];
    }
    final items = async.value;
    if (items == null) return [header, box(const LinearProgressIndicator(minHeight: 2))];
    if (items.isEmpty) return [header, box(Text('Сүүлийн 30 хоногт идэвх бүртгэгдээгүй', style: dim))];
    final shown = _allTimeline ? items : items.take(_timelinePreview).toList();
    final groups = groupByDay([
      for (final i in shown)
        if (i is TimelineAttempt && i.attemptId != null && _edited[i.attemptId] != null)
          i.withState(_edited[i.attemptId]!)
        else
          i,
    ]);
    return [
      header,
      SliverPadding(
        padding: pad,
        sliver: SliverList.builder(
          itemCount: groups.length,
          itemBuilder: (context, gi) {
            final g = groups[gi];
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: AppSpace.sm, bottom: AppSpace.xs),
                  child: Text(DateMn.longWithWeekday(g.day), style: context.text.labelLarge),
                ),
                for (final item in g.items) _TimelineRow(item: item, canEdit: canEdit, onEdit: _editAttempt),
              ],
            );
          },
        ),
      ),
      if (items.length > _timelinePreview && !_allTimeline)
        box(
          TextButton(
            style: TextButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            onPressed: () => setState(() => _allTimeline = true),
            child: Text('Бүгдийг харах (${items.length})'),
          ),
        ),
    ];
  }
}

class _ChapterCard extends StatelessWidget {
  const _ChapterCard({required this.chapter});

  final ChapterProgress chapter;

  @override
  Widget build(BuildContext context) {
    final c = chapter;
    return AppCard(
      padding: const EdgeInsets.all(AppSpace.md),
      semanticLabel: '${c.title}, ${c.successRate == null ? 'дата алга' : '${c.successRate}%'}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(c.title, style: context.text.titleSmall)),
              PercentText(percent: c.successRate, style: context.text.labelLarge),
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          PercentBar(percent: c.successRate, tone: toneOfCorrect(correctTone(c.successRate))),
          const SizedBox(height: AppSpace.xs),
          Meta(
            items: [
              '${c.problemsAttempted} бодлого',
              c.theoryRead ? 'Онол үзсэн' : 'Онол үзээгүй',
              c.videosWatched > 0 ? '${c.videosWatched} бичлэг үзсэн' : 'Бичлэг үзээгүй',
            ],
            style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
          ),
        ],
      ),
    );
  }
}

class _TestCard extends StatelessWidget {
  const _TestCard({required this.test});

  final TestHistory test;

  @override
  Widget build(BuildContext context) {
    final t = test;
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
      child: Row(
        children: [
          Expanded(
            child: ItemRow(
              title: t.title,
              meta: [
                testTypeLabel(t.type),
                if (t.createdAt != null) DateMn.numeric(UbDateTime.fromInstant(t.createdAt!)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('${fmtScore(t.totalScore)}/${fmtScore(t.maxScore)}', style: context.text.titleSmall),
              PercentText(percent: t.percent, style: context.text.labelMedium),
            ],
          ),
        ],
      ),
    );
  }
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({required this.item, required this.canEdit, required this.onEdit});

  final TimelineItem item;
  final bool canEdit;
  final ValueChanged<TimelineAttempt> onEdit;

  static IconData _icon(TimelineItem i) => switch (i) {
    TimelineAttempt(selfState: 'SOLVED_CLEAN') => AppIcons.success,
    TimelineAttempt(selfState: 'FIXED_AFTER_ERROR') => AppIcons.repeat,
    TimelineAttempt(selfState: 'FAILED') => AppIcons.failure,
    TimelineAttempt(selfState: 'GUESSED') => AppIcons.goal,
    TimelineAttempt() => AppIcons.circleDot,
    TimelineEvent(type: 'LOGIN') => AppIcons.key,
    TimelineEvent(type: 'LOGOUT') => AppIcons.doorOpen,
    TimelineEvent(type: 'SEARCH') => AppIcons.search,
    TimelineEvent(type: 'CHAPTER_OPENED') => AppIcons.theory,
    TimelineEvent(type: 'VIDEO_STARTED' || 'VIDEO_COMPLETED') => AppIcons.video,
    TimelineEvent(type: 'PROBLEM_OPENED' || 'ANSWER_SUBMITTED') => AppIcons.homework,
    TimelineEvent(type: 'HINT_USED') => AppIcons.lightbulb,
    TimelineEvent(type: 'RETRY') => AppIcons.retry,
    TimelineEvent(type: 'BOOKMARK') => AppIcons.pin,
    TimelineEvent(type: 'TEST_STARTED' || 'TEST_FINISHED') => AppIcons.exam,
    TimelineEvent(type: 'EVENING_MARK') => AppIcons.dark,
    TimelineEvent(type: 'PAGE_VIEW') => AppIcons.show,
    TimelineEvent() => AppIcons.circle,
  };

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final attempt = item is TimelineAttempt ? item as TimelineAttempt : null;
    final editable = canEdit && attempt?.attemptId != null;
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 40),
      child: Row(
        children: [
          Icon(_icon(item), size: 16, color: c.inkDim),
          const SizedBox(width: AppSpace.sm),
          Expanded(child: Text(timelineText(item), style: context.text.bodyMedium, maxLines: 2)),
          Text(DateMn.time(UbDateTime.fromInstant(item.at)), style: context.text.bodySmall?.copyWith(color: c.inkDim)),
          if (editable)
            IconButton(
              tooltip: 'Тэмдэглэгээ засах',
              icon: const Icon(AppIcons.pencilLine, size: 18),
              onPressed: () => onEdit(attempt!),
            ),
        ],
      ),
    );
  }
}

/// Сүүлийн 12 долоо хоногийн идэвх — жижиг нүдний зураг (график хэмнэлттэй). Тайлбар доор.
class ActivityWeeks extends StatelessWidget {
  const ActivityWeeks({super.key, required this.weeks});

  /// Багана бүр Даваа–Ням, 0–4 түвшин, -1 = ирээдүй.
  final List<List<int>> weeks;

  Color _color(BuildContext context, int level) {
    final c = context.colors;
    if (level <= 0) return c.line;
    return c.brandBright.withValues(alpha: 0.25 + 0.75 * (level / 4));
  }

  @override
  Widget build(BuildContext context) {
    final active = weeks.expand((w) => w).where((l) => l > 0).length;
    return Semantics(
      label: 'Сүүлийн ${weeks.length} долоо хоногт $active өдөр идэвхтэй',
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LayoutBuilder(
            builder: (context, box) {
              const gap = 3.0;
              final cell = ((box.maxWidth - gap * (weeks.length - 1)) / weeks.length).clamp(6.0, 18.0);
              return Row(
                children: [
                  for (var w = 0; w < weeks.length; w++) ...[
                    if (w > 0) const SizedBox(width: gap),
                    Column(
                      children: [
                        for (var d = 0; d < 7; d++) ...[
                          if (d > 0) const SizedBox(height: gap),
                          Container(
                            width: cell,
                            height: cell,
                            decoration: BoxDecoration(
                              color: weeks[w][d] < 0 ? null : _color(context, weeks[w][d]),
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ],
              );
            },
          ),
          const SizedBox(height: AppSpace.sm),
          Row(
            children: [
              Text('Бага', style: context.text.labelSmall?.copyWith(color: context.colors.inkDim)),
              const SizedBox(width: AppSpace.xs),
              for (var l = 0; l <= 4; l++) ...[
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(color: _color(context, l), borderRadius: BorderRadius.circular(2)),
                ),
                const SizedBox(width: 2),
              ],
              const SizedBox(width: AppSpace.xs),
              Text('Их', style: context.text.labelSmall?.copyWith(color: context.colors.inkDim)),
              const Spacer(),
              Text('$active өдөр идэвхтэй', style: context.text.labelSmall?.copyWith(color: context.colors.inkDim)),
            ],
          ),
        ],
      ),
    );
  }
}
