import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/ui/ui.dart';
import '../../homework/domain/homework_logic.dart' show dayLabel;
import '../../homework/ui/homework_providers.dart';
import '../../student_home/ui/activity_week_card.dart' show weekDots;
import '../application/mistakes_controller.dart';
import '../application/study_hub_providers.dart';
import '../data/activity_models.dart';
import '../data/activity_repository.dart';
import '../data/formula_review_repository.dart';
import '../data/mistake_models.dart';
import '../data/practice_models.dart';
import '../data/practice_repository.dart';
import '../data/problem_review_models.dart';
import '../data/problem_review_repository.dart';
import '../data/readiness_models.dart';
import '../data/readiness_repository.dart';
import '../domain/study_plan.dart';

// «Бие даан суралцах» төвийн хэсгүүд (`docs/RESEARCH-2026-11.md` §2). Өнгө аяс тайван, хувийн:
// эрэмбэ, улаан өнгө, буруутгах бичиг ХЭЗЭЭ Ч үгүй (UX-RESEARCH §10). Ачаалал нь статик skeleton.

/// Хэсгийн гарчгийн нэгэн хэв маяг.
class _CardTitle extends StatelessWidget {
  const _CardTitle({required this.icon, required this.title, this.trailing});

  final IconData icon;
  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      children: [
        Icon(icon, size: 20, color: c.brandSoft),
        const SizedBox(width: AppSpace.sm),
        Expanded(
          child: Text(
            title,
            style: context.text.titleMedium?.copyWith(color: c.brandSoft, fontWeight: FontWeight.w700),
          ),
        ),
        ?trailing,
      ],
    );
  }
}

/// Даралттай мөр: 56 өндөр (48-аас багагүй дарах талбай), дүрс, гарчиг, тайлбар, сум.
class _LinkRow extends StatelessWidget {
  const _LinkRow({required this.icon, required this.title, required this.onTap, this.subtitle, this.trailing});

  final IconData icon;
  final String title;
  final Widget? subtitle;
  final Widget? trailing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return InkWell(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 56),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.sm),
          child: Row(
            children: [
              Icon(icon, size: 22, color: c.brand),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: context.text.titleSmall),
                    if (subtitle != null)
                      DefaultTextStyle.merge(
                        style: context.text.bodySmall?.copyWith(color: c.inkDim),
                        child: subtitle!,
                      ),
                  ],
                ),
              ),
              if (trailing != null) ...[const SizedBox(width: AppSpace.sm), trailing!],
              const SizedBox(width: AppSpace.xs),
              Icon(AppIcons.forward, size: 18, color: c.inkDim),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 1. Өнөөдрийн төлөвлөгөө

/// Гэрийн даалгавар (хамгийн дээр, тэмдэглэгээтэй) + 3–4 богино ажил, ~15–25 мин.
class TodayPlanCard extends ConsumerWidget {
  const TodayPlanCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = ref.watch(studyNowProvider);
    final today = now.dateKey;
    final online = ref.watch(isOnlineStudentProvider);
    final AsyncValue<List<HomeworkDue>> homework;
    String? lastTopic;
    if (online) {
      homework = ref.watch(assignmentsProvider).whenData(onlineHomeworkDue);
    } else {
      final days = ref.watch(homeworkDaysProvider);
      homework = days.whenData((l) => classroomHomeworkDue(l, today, now: now.toInstant()));
      final l = days.value;
      lastTopic = l == null ? null : lastLessonTopic(l, today);
    }
    final mistakes = ref.watch(todayMistakesProvider);
    final formulas = ref.watch(formulaReviewCountProvider);
    final due = ref.watch(dueProblemsProvider);
    final exams = ref.watch(myExamsProvider);
    final pending = [homework, mistakes, formulas].any((a) => a.isLoading && !a.hasValue);
    if (pending) return const SkeletonCard(lines: 4);

    final topic = lastTopic?.trim();
    final match = topic == null || topic.isEmpty ? null : ref.watch(lessonTopicChapterProvider(topic)).value;
    final counts = _reviewCounts(mistakes, formulas, due);
    final items = buildTodayPlan(
      PlanInputs(
        homework: homework.value ?? const [],
        mistakesToday: mistakes.value?.length,
        formulasDue: formulas.value,
        problemsDue: due.hasValue ? counts.problems : null,
        lastTopic: lastTopic,
        lastTopicPath: match == null ? null : practiceTopicPath(match.chapterIds, title: topic),
        nextExam: exams.value == null ? null : nextExam(exams.value!, now, withinDays: 7),
      ),
    );
    final minutes = planMinutes(items);
    final c = context.colors;
    return AppCard(
      padding: const EdgeInsets.symmetric(vertical: AppSpace.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg),
            child: _CardTitle(
              icon: AppIcons.listTodo,
              title: 'Өнөөдрийн төлөвлөгөө',
              trailing: minutes == 0
                  ? null
                  : Text('$minutes мин орчим', style: context.text.bodySmall?.copyWith(color: c.inkDim)),
            ),
          ),
          const SizedBox(height: AppSpace.xs),
          for (final p in items)
            Semantics(
              button: true,
              label: [
                if (p.pinned) 'Зүүсэн',
                p.title,
                ?p.subtitle,
                if (p.minutes != null) '${p.minutes} минут',
              ].join(', '),
              excludeSemantics: true,
              child: _LinkRow(
                icon: _planIcon(p.kind),
                title: p.title,
                subtitle: p.subtitle == null ? null : Text(p.subtitle!, maxLines: 2, overflow: TextOverflow.ellipsis),
                trailing: p.pinned
                    ? Icon(AppIcons.pin, size: 16, color: c.brandSoft)
                    : p.minutes == null
                    ? null
                    : Text('${p.minutes} мин', style: context.text.labelMedium?.copyWith(color: c.inkDim)),
                onTap: () => context.push(p.path),
              ),
            ),
        ],
      ),
    );
  }

  static IconData _planIcon(PlanKind k) => switch (k) {
    PlanKind.homework => AppIcons.homework,
    PlanKind.formulas => AppIcons.formula,
    PlanKind.mistakes => AppIcons.restart,
    PlanKind.problemReview => AppIcons.repeat,
    PlanKind.lastTopic => AppIcons.theory,
    PlanKind.nextExam => AppIcons.exam,
    PlanKind.practice => AppIcons.practice,
  };
}

// ---------------------------------------------------------------------------
// 2. Тань дээр ажиллах

/// Хамгийн сул 3 сэдэв, 4 түвшингээр (оноо биш). Сэдэв бүлэгтэй бол мөрийг дарахад тэр сэдвээр дасгал;
/// гарчгийг дарахад бэлэн байдлын дэлгэц. Сервер тооцоогүй бол нууцлагдана.
class WeakTopicsCard extends ConsumerWidget {
  const WeakTopicsCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(readinessProvider);
    if (async.hasError && !async.hasValue) return const SizedBox.shrink();
    final r = async.value;
    if (r == null) return const SkeletonCard(lines: 3);
    final c = context.colors;
    final topics = weakestTopics(r);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppCard(
          padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(
                button: true,
                label: topics.isEmpty
                    ? 'Тань дээр ажиллах. Дасгал, тест хийх тусам сэдвүүд гарна'
                    : 'Тань дээр ажиллах. Бэлэн байдлыг нээх',
                excludeSemantics: true,
                child: InkWell(
                  onTap: () => context.push('/app/readiness'),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 48),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.sm),
                      child: _CardTitle(
                        icon: AppIcons.gauge,
                        title: 'Тань дээр ажиллах',
                        trailing: Icon(AppIcons.forward, size: 18, color: c.inkDim),
                      ),
                    ),
                  ),
                ),
              ),
              if (topics.isEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.xs, AppSpace.lg, AppSpace.sm),
                  child: Text(
                    'Дасгал, тест хийх тусам энд сэдэв бүрийн түвшин гарна',
                    style: context.text.bodyMedium?.copyWith(color: c.inkDim),
                  ),
                )
              else
                for (final t in topics) _WeakTopicRow(topic: t),
            ],
          ),
        ),
        if (topics.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: AppSpace.sm, left: AppSpace.xs),
            child: ExcludeSemantics(
              child: Meta(
                items: [for (final l in MasteryLevel.values) l.label],
                style: context.text.bodySmall?.copyWith(color: c.inkDim),
              ),
            ),
          ),
      ],
    );
  }
}

/// Нэг сул сэдэв: бүлэгтэй бол тэр сэдвээр дасгал, үгүй бол бэлэн байдлын дэлгэц. Дарах өндөр 56.
class _WeakTopicRow extends StatelessWidget {
  const _WeakTopicRow({required this.topic});

  final ReadinessTopic topic;

  @override
  Widget build(BuildContext context) {
    final chapter = topic.chapterId;
    final level = MasteryLevel.fromPercent(topic.mastery ?? 0);
    return Semantics(
      button: true,
      label: chapter == null
          ? '${topic.title}: ${level.label}'
          : '${topic.title}: ${level.label}. Энэ сэдвээр дасгал хийх',
      excludeSemantics: true,
      child: InkWell(
        onTap: () =>
            context.push(chapter == null ? '/app/readiness' : practiceTopicPath([chapter], title: topic.title)),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 56),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.sm),
            child: Row(
              children: [
                Expanded(child: _TopicLevelRow(topic: topic)),
                const SizedBox(width: AppSpace.sm),
                Icon(chapter == null ? AppIcons.forward : AppIcons.practice, size: 18, color: context.colors.inkDim),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TopicLevelRow extends StatelessWidget {
  const _TopicLevelRow({required this.topic});

  final ReadinessTopic topic;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final level = MasteryLevel.fromPercent(topic.mastery ?? 0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(topic.title, style: context.text.bodyMedium, maxLines: 1, overflow: TextOverflow.ellipsis),
            ),
            const SizedBox(width: AppSpace.sm),
            Text(level.label, style: context.text.labelMedium?.copyWith(color: c.brandSoft)),
          ],
        ),
        const SizedBox(height: AppSpace.xs),
        LevelSteps(filled: level.steps),
      ],
    );
  }
}

/// Хэсэгчилсэн шат (4 эсвэл [total] хэсэг) — зөвхөн брэндийн өнгө, улаан үгүй.
class LevelSteps extends StatelessWidget {
  const LevelSteps({super.key, required this.filled, this.total = 4});

  final int filled;
  final int total;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      children: [
        for (var i = 0; i < total; i++) ...[
          if (i > 0) const SizedBox(width: 4),
          Expanded(
            child: Container(
              height: 6,
              decoration: BoxDecoration(
                color: i < filled ? c.brandBright : c.line,
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Давтах

/// Хугацаа нь болсон бодлого + өнөөдрийн алдаа + томьёо нэг тоолуураар (давхардсан бодлогыг нэг л удаа).
ReviewCounts _reviewCounts(AsyncValue<List<Mistake>> mistakes, AsyncValue<int> formulas, AsyncValue<DueReviews> due) =>
    reviewCounts(
      mistakeProblemIds: [for (final m in mistakes.value ?? const <Mistake>[]) m.problem.id],
      formulas: formulas.value ?? 0,
      dueTotal: due.value?.total ?? 0,
      dueProblemIds: [for (final d in due.value?.items ?? const <DueReview>[]) d.problem.id],
    );

class ReviewCounterCard extends ConsumerWidget {
  const ReviewCounterCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mistakes = ref.watch(todayMistakesProvider);
    final formulas = ref.watch(formulaReviewCountProvider);
    final due = ref.watch(dueProblemsProvider);
    if (mistakes.hasError && formulas.hasError && due.hasError) return const SizedBox.shrink();
    if (!mistakes.hasValue && !formulas.hasValue && !due.hasValue) return const SkeletonCard(lines: 1);
    final n = _reviewCounts(mistakes, formulas, due);
    final c = context.colors;
    final path = n.problems > 0
        ? '/app/study/due'
        : n.mistakes > 0
        ? '/app/mistakes/today'
        : '/app/formulas/review';
    final parts = [if (n.problems > 0) 'Бодлого ${n.problems}', 'Алдаа ${n.mistakes}', 'Томьёо ${n.formulas}'];
    return AppCard(
      onTap: () => context.push(path),
      semanticLabel: n.total == 0
          ? 'Давтах. Өнөөдөр давтах зүйл алга'
          : 'Давтах. Нийт ${n.total}: ${parts.join(', ')}. Нээх',
      child: ExcludeSemantics(
        child: Row(
          children: [
            Icon(AppIcons.repeat, color: c.brand),
            const SizedBox(width: AppSpace.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Давтах', style: context.text.titleSmall),
                  if (n.total == 0)
                    Text('Өнөөдөр давтах зүйл алга', style: context.text.bodySmall?.copyWith(color: c.inkDim))
                  else
                    Meta(
                      items: parts,
                      style: context.text.bodySmall?.copyWith(color: c.inkDim),
                    ),
                ],
              ),
            ),
            if (n.total > 0) Text('${n.total}', style: context.text.titleLarge),
            const SizedBox(width: AppSpace.xs),
            Icon(AppIcons.forward, size: 18, color: c.inkDim),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 4. Ангитай холбоо

/// «Дараагийн хичээл» (танхимын загвар) ба ойрын шалгалт. Аль аль нь байхгүй бол нууцлагдана.
class ClassLinkCard extends ConsumerWidget {
  const ClassLinkCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = ref.watch(studyNowProvider);
    final online = ref.watch(isOnlineStudentProvider);
    final days = online ? null : ref.watch(homeworkDaysProvider).value;
    final lesson = days == null ? null : nextLesson(days, now.dateKey);
    final exams = ref.watch(myExamsProvider).value;
    final exam = exams == null ? null : nextExam(exams, now);
    if (lesson == null && exam == null) return const SizedBox.shrink();
    return AppCard(
      padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (lesson != null)
            _LinkRow(
              icon: AppIcons.calendar,
              title: 'Дараагийн хичээл',
              subtitle: Meta(
                items: [
                  if (lesson.date == now.dateKey) 'Өнөөдөр' else dayLabel(lesson.date),
                  lesson.classroomName,
                  lesson.topic,
                ],
              ),
              onTap: () => context.go('/app/my-class'),
            ),
          if (exam != null)
            _LinkRow(
              icon: AppIcons.exam,
              title: 'Ойрын шалгалт',
              subtitle: Meta(items: [exam.title, if (exam.at != null) DateMn.long(exam.at!)]),
              onTap: () => context.go('/app/tests'),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 5. 7 хоногийн зорилго (сурагч өөрөө тавина, зөвхөн өөрт нь)

class WeeklyGoalCard extends ConsumerWidget {
  const WeeklyGoalCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = ref.watch(studyNowProvider);
    final goal = ref.watch(weeklyGoalProvider);
    if (!goal.hasValue) return const SizedBox.shrink();
    final c = context.colors;
    final g = goal.value;
    if (g == null) {
      return AppCard(
        onTap: () => showWeeklyGoalSheet(context, ref, current: null),
        semanticLabel: '7 хоногийн зорилго. 7 хоногт хэдэн өдөр суралцахаа өөрөө сонгоно. Тавих',
        child: ExcludeSemantics(
          child: Row(
            children: [
              Icon(AppIcons.goal, color: c.brand),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('7 хоногийн зорилго', style: context.text.titleSmall),
                    Text(
                      '7 хоногт хэдэн өдөр суралцахаа өөрөө сонгоно',
                      style: context.text.bodySmall?.copyWith(color: c.inkDim),
                    ),
                  ],
                ),
              ),
              Icon(AppIcons.add, size: 20, color: c.brandSoft),
            ],
          ),
        ),
      );
    }
    final year = ref.watch(activityYearProvider(now.year));
    final active = weekDots(now, year.value).where((d) => d.done).length;
    final p = WeeklyGoalProgress(goal: g, activeDays: active);
    final shown = active > g ? g : active;
    final rest = restDayNote(ref.watch(activityStreakProvider).value);
    final note = !year.hasValue
        ? ' '
        : p.reached
        ? 'Энэ 7 хоногийн зорилго биелсэн. Бусад өдөр амарч болно'
        : 'Дахиад ${p.remaining} өдөр';
    return AppCard(
      padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.sm, AppSpace.xs, AppSpace.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _CardTitle(
            icon: AppIcons.goal,
            title: '7 хоногийн зорилго',
            trailing: IconButton(
              tooltip: 'Зорилго өөрчлөх',
              icon: const Icon(AppIcons.draft, size: 18),
              onPressed: () => showWeeklyGoalSheet(context, ref, current: g),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(right: AppSpace.md),
            child: Semantics(
              label: ['Энэ 7 хоногт $active өдөр, зорилго $g өдөр. $note', ?rest].join('. '),
              excludeSemantics: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Энэ 7 хоногт $active / $g өдөр', style: context.text.titleSmall),
                  const SizedBox(height: AppSpace.sm),
                  LevelSteps(filled: shown, total: g),
                  const SizedBox(height: AppSpace.sm),
                  Text(note, style: context.text.bodySmall?.copyWith(color: c.inkDim)),
                  if (rest != null) ...[
                    const SizedBox(height: AppSpace.xs),
                    Row(
                      children: [
                        Icon(AppIcons.calendarCheck, size: 16, color: c.brandSoft),
                        const SizedBox(width: AppSpace.xs),
                        Expanded(
                          child: Text(rest, style: context.text.bodySmall?.copyWith(color: c.inkDim)),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 1–7 өдрөөс сонгох. Сонгомогц хадгалж хаана.
Future<void> showWeeklyGoalSheet(BuildContext context, WidgetRef ref, {required int? current}) {
  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (sheet) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('7 хоногт хэдэн өдөр суралцах вэ', style: sheet.text.titleMedium),
            const SizedBox(height: AppSpace.xs),
            Text(
              'Зөвхөн танд харагдана. Хэдийд ч өөрчилж болно',
              style: sheet.text.bodySmall?.copyWith(color: sheet.colors.inkDim),
            ),
            const SizedBox(height: AppSpace.lg),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                for (var n = 1; n <= 7; n++)
                  ChoiceChip(
                    label: Text('$n өдөр'),
                    selected: current == n,
                    materialTapTargetSize: MaterialTapTargetSize.padded,
                    onSelected: (_) {
                      Navigator.of(sheet).pop();
                      _saveGoal(context, ref, n);
                    },
                  ),
              ],
            ),
            if (current != null) ...[
              const SizedBox(height: AppSpace.md),
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: TextButton(
                  onPressed: () {
                    Navigator.of(sheet).pop();
                    _saveGoal(context, ref, null);
                  },
                  child: const Text('Зорилгогүй байх'),
                ),
              ),
            ],
          ],
        ),
      ),
    ),
  );
}

Future<void> _saveGoal(BuildContext context, WidgetRef ref, int? days) async {
  final messenger = ScaffoldMessenger.maybeOf(context);
  final ok = await ref.read(weeklyGoalProvider.notifier).set(days);
  if (!ok) messenger?.showSnackBar(const SnackBar(content: Text('Зорилго хадгалагдсангүй. Дахин оролдоно уу')));
}

/// Амралтын өдрийн тайван мэдээлэл (улаангүй, буруутгалгүй). Хуучин сервер талбаргүй бол null.
String? restDayNote(ActivityStreak? s) {
  final used = s?.restDayUsedThisWeek;
  if (used == null) return null;
  return used ? 'Энэ 7 хоногийн амралтын өдрөө ашигласан' : '7 хоногт нэг өдөр амарч болно, цуврал тасрахгүй';
}
