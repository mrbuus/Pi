import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/session.dart';
import '../../../core/files/file_image.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/marks/marks.dart';
import '../../learning/data/activity_repository.dart';
import '../../my_class/data/hub_models.dart';
import '../../my_class/data/my_class_repository.dart';
import '../../my_class/domain/hub_logic.dart';
import '../../my_class/ui/common.dart';
import '../../my_class/ui/day_row.dart';
import '../../my_class/ui/day_screen.dart';
import 'activity_week_card.dart';

/// Сурагчийн «Миний самбар» (`/app/student`) — вэбийн `StudentDashboard` (SURAGCH-V2-GEREE):
/// мэндчилгээ → өнөөдрийн хичээл + түргэн үйлдэл → ирц, даалгаврын хувь → багшийн сүүлийн
/// тэмдэглэгээ → сүүлийн хичээлүүд → түргэн холбоос (QR, шалгалт) → төлбөр → төвийн мэдэгдэл.
/// Дэлгэрэнгүй бүгд «Хичээл» (`/app/my-class`) хэсэгт — энд давхардуулахгүй.
class StudentHomeScreen extends ConsumerWidget {
  const StudentHomeScreen({super.key, this.now});

  /// Тестэд тогтмол цаг.
  final UbDateTime? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final today = now ?? UbDateTime.now();
    final overview = ref.watch(hubOverviewProvider);
    final classrooms = ref.watch(myClassroomsProvider);
    final ov = overview.value;
    final inClass = ov != null && ov.classrooms.isNotEmpty;
    final hasOnline = classrooms.value?.any((c) => c.type == 'ONLINE') ?? false;
    final month = currentMonthKey(today);

    return Scaffold(
      appBar: AppBar(title: const Text('Миний самбар')),
      body: RefreshIndicator(
        onRefresh: () => refreshProviders(ref, [
          hubOverviewProvider,
          myClassroomsProvider,
          hubDaysProvider(month),
          paidUntilProvider,
          announcementsProvider,
          activityYearProvider(today.year),
          activityStreakProvider,
        ]),
        child: ListView(
          padding: const EdgeInsets.all(AppSpace.gutter),
          children: [
            const _Greeting(),
            const SizedBox(height: AppSpace.lg),
            if (overview.hasError && ov == null)
              ErrorState(message: errorMessageOf(overview.error!), onRetry: () => ref.invalidate(hubOverviewProvider))
            else if (ov == null)
              const _DashboardSkeleton()
            else if (inClass) ...[
              TodayCard(today: ov.today, todayKey: today.dateKey),
              const SizedBox(height: AppSpace.md),
              IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: RateTile(
                        title: 'Ирц',
                        icon: AppIcons.calendarCheck,
                        rate: ov.attendance.rate,
                        total: ov.attendance.total,
                        items: [
                          for (final s in attendanceOrder) (meta: attendanceMeta(s), value: ov.attendance.count(s)),
                        ],
                        onTap: () => context.go('/app/my-class?tab=attendance'),
                      ),
                    ),
                    const SizedBox(width: AppSpace.md),
                    Expanded(
                      child: RateTile(
                        title: 'Даалгавар',
                        icon: AppIcons.homework,
                        rate: ov.homework.rate,
                        total: ov.homework.total,
                        items: [for (final s in homeworkOrder) (meta: homeworkMeta(s), value: ov.homework.count(s))],
                        onTap: () => context.go('/app/my-class'),
                      ),
                    ),
                  ],
                ),
              ),
              if (ov.latestMark != null) ...[const SizedBox(height: AppSpace.md), LatestMarkCard(mark: ov.latestMark!)],
              const SizedBox(height: AppSpace.md),
              RecentDaysCard(today: today),
            ] else if (!hasOnline && !classrooms.isLoading)
              const EmptyState(
                icon: AppIcons.calendar,
                title: 'Танхимын ангид элсээгүй байна',
                message: 'Ангид элссэний дараа хичээл, ирц, даалгавар энд харагдана',
              ),
            if (hasOnline) ...[
              const SizedBox(height: AppSpace.md),
              _LinkCard(
                icon: AppIcons.homework,
                title: 'Онлайн даалгавар',
                subtitle: 'Багшийн өгсөн даалгаврыг харах, илгээх',
                onTap: () => context.go('/app/homework'),
              ),
            ],
            const SizedBox(height: AppSpace.md),
            ActivityWeekCard(today: today),
            const SizedBox(height: AppSpace.md),
            const _QuickLinks(),
            const SizedBox(height: AppSpace.md),
            PaidUntilCard(today: today),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                icon: const Icon(AppIcons.forward, size: 16),
                label: const Text('Төлбөрийн дэлгэрэнгүй'),
                onPressed: () => context.push('/app/student/payments'),
              ),
            ),
            const AnnouncementsCard(),
            const SizedBox(height: AppSpace.xl),
          ],
        ),
      ),
    );
  }
}

class _DashboardSkeleton extends StatelessWidget {
  const _DashboardSkeleton();

  @override
  Widget build(BuildContext context) {
    return const SkeletonPulse(
      child: Column(
        children: [
          SkeletonCard(lines: 3),
          SizedBox(height: AppSpace.md),
          Row(
            children: [
              Expanded(child: SkeletonCard()),
              SizedBox(width: AppSpace.md),
              Expanded(child: SkeletonCard()),
            ],
          ),
          SizedBox(height: AppSpace.md),
          SkeletonCard(lines: 4),
        ],
      ),
    );
  }
}

/// Мэндчилгээ: профайл зураг (эсвэл эхний үсэг), нэр.
class _Greeting extends ConsumerWidget {
  const _Greeting();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final user = session is SignedIn ? session.user : null;
    final c = context.colors;
    final first = user?.firstName.trim() ?? '';
    final initials = [
      first,
      user?.lastName?.trim() ?? '',
    ].where((s) => s.isNotEmpty).map((s) => s.substring(0, 1).toUpperCase()).join();
    final avatar = user?.avatarUrl;
    return Row(
      children: [
        Container(
          width: 52,
          height: 52,
          alignment: Alignment.center,
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: c.line, width: 2),
          ),
          child: avatar != null
              ? Image(
                  image: ResizeImage(ref.watch(fileImageProvider).image(avatar), width: 156),
                  width: 52,
                  height: 52,
                  fit: BoxFit.cover,
                  semanticLabel: 'Профайл зураг',
                  errorBuilder: (_, _, _) =>
                      Text(initials, style: context.text.titleMedium?.copyWith(color: c.brandSoft)),
                )
              : Text(initials, style: context.text.titleMedium?.copyWith(color: c.brandSoft)),
        ),
        const SizedBox(width: AppSpace.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Сайн байна уу', style: context.text.bodySmall),
              Text(
                first.isEmpty ? AppStrings.appName : first,
                style: context.text.headlineSmall,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Өнөөдрийн хичээл + түргэн үйлдэл (онол илгээх, даалгавар).
class TodayCard extends StatelessWidget {
  const TodayCard({super.key, required this.today, required this.todayKey});

  final HubToday? today;
  final String todayKey;

  @override
  Widget build(BuildContext context) {
    final t = today;
    return SectionCard(
      icon: AppIcons.calendar,
      title: 'Өнөөдөр',
      trailing: Text(dayTitle(todayKey), style: context.text.bodySmall),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (t == null)
            const DashedNote('Өнөөдөр хичээлгүй')
          else
            InkWell(
              borderRadius: BorderRadius.circular(AppRadius.md),
              onTap: () => context.push(dayPath(todayKey, t.classroomId)),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
                child: Row(
                  children: [
                    RoomBadge(room: t.room, size: 44),
                    const SizedBox(width: AppSpace.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(timeRange(t.startMinute, t.endMinute) ?? '', style: context.text.titleMedium),
                          Meta(items: [t.topic, t.classroomName]),
                        ],
                      ),
                    ),
                    Icon(AppIcons.forward, size: 18, color: context.colors.inkDim),
                  ],
                ),
              ),
            ),
          const SizedBox(height: AppSpace.md),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  icon: const Icon(AppIcons.theoryPhoto, size: 18),
                  label: Text(t != null ? 'Онол илгээх' : 'Онолын зураг', overflow: TextOverflow.ellipsis),
                  onPressed: () => context.go(t != null ? '/app/theory?date=$todayKey' : '/app/theory'),
                ),
              ),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(AppIcons.homework, size: 18),
                  label: const Text('Даалгавар', overflow: TextOverflow.ellipsis),
                  onPressed: () => context.go('/app/homework'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Ирц / даалгаврын хувь (бүх хугацаа, сервер тооцсон) + төлөв бүрийн тоо.
class RateTile extends StatelessWidget {
  const RateTile({
    super.key,
    required this.title,
    required this.icon,
    required this.rate,
    required this.total,
    required this.items,
    required this.onTap,
  });

  final String title;
  final IconData icon;
  final int rate;
  final int total;
  final List<({MarkMeta meta, int value})> items;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    // Эхний төлөв үргэлж, бусад нь 0-ээс их бол (вэбтэй ижил).
    final shown = [
      for (var i = 0; i < items.length; i++)
        if (i == 0 || items[i].value > 0) items[i],
    ];
    final summary = total == 0
        ? '$title, тэмдэглэгээ алга'
        : '$title $rate хувь, $total хичээлээс. ${shown.map((e) => '${e.meta.label} ${e.value}').join(', ')}';
    return Semantics(
      button: true,
      label: summary,
      excludeSemantics: true,
      child: AppCard(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 16, color: c.inkDim),
                const SizedBox(width: 6),
                Text(
                  title,
                  style: context.text.labelMedium?.copyWith(color: c.inkDim, fontWeight: FontWeight.w700),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.sm),
            if (total == 0)
              Text('Тэмдэглэгээ алга', style: context.text.bodyMedium?.copyWith(color: c.inkDim))
            else ...[
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(text: '$rate', style: context.text.displaySmall),
                    TextSpan(
                      text: '%',
                      style: context.text.titleMedium?.copyWith(color: c.inkDim),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpace.sm),
              ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.pill),
                child: LinearProgressIndicator(
                  value: (rate.clamp(0, 100)) / 100,
                  minHeight: 6,
                  color: c.brandBright,
                  backgroundColor: c.line,
                ),
              ),
              const SizedBox(height: AppSpace.sm),
              Wrap(
                spacing: AppSpace.md,
                runSpacing: 2,
                children: [
                  for (final it in shown)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        MarkIcon(it.meta.glyph, color: it.meta.tone.color(c), size: 14),
                        const SizedBox(width: 2),
                        Text('${it.value}', style: context.text.labelMedium?.copyWith(fontWeight: FontWeight.w700)),
                      ],
                    ),
                ],
              ),
              const SizedBox(height: 2),
              Text('$total хичээлээс', style: context.text.labelSmall?.copyWith(color: c.inkDim)),
            ],
          ],
        ),
      ),
    );
  }
}

/// Багшийн сүүлийн даалгаврын тэмдэглэгээ.
class LatestMarkCard extends StatelessWidget {
  const LatestMarkCard({super.key, required this.mark});

  final LatestMark mark;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      icon: AppIcons.messageSquareText,
      title: 'Багшийн тэмдэглэгээ',
      trailing: Text(dayShort(mark.date), style: context.text.bodySmall),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          HomeworkMarkView(status: mark.status),
          if (mark.comment != null && mark.comment!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            TeacherComment(text: mark.comment!),
          ],
        ],
      ),
    );
  }
}

/// Сүүлийн 5 хичээлийн өдөр (энэ сар, хүрэлцэхгүй бол өмнөх сар).
class RecentDaysCard extends ConsumerWidget {
  const RecentDaysCard({super.key, required this.today});

  final UbDateTime today;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final month = currentMonthKey(today);
    final cur = ref.watch(hubDaysProvider(month));
    final curData = cur.value;
    final prevKey = curData != null && curData.days.length < 5 ? curData.prevMonth : null;
    final prev = prevKey == null ? null : ref.watch(hubDaysProvider(prevKey));
    final loading = curData == null && !cur.hasError || (prev != null && prev.value == null && !prev.hasError);
    return SectionCard(
      icon: AppIcons.checklist,
      title: 'Сүүлийн хичээлүүд',
      padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.lg, AppSpace.lg, AppSpace.sm),
      trailing: TextButton(onPressed: () => context.go('/app/my-class'), child: const Text('Бүгд')),
      child: Builder(
        builder: (context) {
          if (cur.hasError && curData == null) {
            return InlineError(
              message: errorMessageOf(cur.error!),
              onRetry: () => ref.invalidate(hubDaysProvider(month)),
            );
          }
          if (loading) return const SkeletonPulse(child: SkeletonRows(rows: 3));
          final days = recentDays(curData, prev?.value);
          if (days.isEmpty) return const DashedNote('Хичээлийн өдөр хараахан алга');
          return Column(
            children: [
              for (var i = 0; i < days.length; i++) ...[
                if (i > 0) Divider(height: 1, color: context.colors.line),
                DayRow(
                  day: days[i],
                  today: today.dateKey,
                  onOpen: () => context.push(dayPath(days[i].date, days[i].classroomId)),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _QuickLinks extends StatelessWidget {
  const _QuickLinks();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _LinkCard(
            icon: AppIcons.scan,
            title: 'QR уншуулах',
            subtitle: 'Номын бодлого',
            onTap: () => context.push('/app/scan'),
          ),
        ),
        const SizedBox(width: AppSpace.md),
        Expanded(
          child: _LinkCard(
            icon: AppIcons.exam,
            title: 'Шалгалт',
            subtitle: 'Тест өгөх, дүн',
            onTap: () => context.push('/app/tests'),
          ),
        ),
      ],
    );
  }
}

class _LinkCard extends StatelessWidget {
  const _LinkCard({required this.icon, required this.title, required this.subtitle, required this.onTap});

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      semanticLabel: title,
      padding: const EdgeInsets.all(AppSpace.md),
      child: Row(
        children: [
          Icon(icon, color: context.colors.brandSoft),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: context.text.titleSmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                Text(subtitle, style: context.text.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// «Хэдий хүртэл төлсөн» (вэбийн `PaidUntilCard`) — өнгө + дүрс + үг гурвуулаа.
class PaidUntilCard extends ConsumerWidget {
  const PaidUntilCard({super.key, required this.today});

  final UbDateTime today;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(paidUntilProvider);
    final c = context.colors;
    return AppCard(
      child: AsyncBody(
        value: value,
        compactError: true,
        onRetry: () => ref.invalidate(paidUntilProvider),
        loading: const SkeletonPulse(child: SkeletonRows(rows: 2)),
        builder: (paidUntil) {
          final left = paidUntilDaysLeft(paidUntil, today);
          final state = paidUntilState(left);
          final (IconData icon, Color tone, String title, String hint) = switch (state) {
            PaidUntilState.unknown => (
              AppIcons.upcoming,
              c.inkDim,
              'Төлбөрийн хугацаа тооцогдоогүй байна',
              'Анги, төлбөрийн мэдээлэл бүртгэгдмэгц энд харагдана',
            ),
            PaidUntilState.expired => (
              AppIcons.calendarExpired,
              c.error,
              '${left!.abs()} хоногийн өмнө дууссан',
              'Хичээлээ тасалдуулахгүйн тулд төлбөрөө төлөөрэй',
            ),
            PaidUntilState.endingSoon => (
              AppIcons.upcoming,
              c.info,
              left == 0 ? 'Өнөөдөр дуусна' : '$left хоногийн дараа дуусна',
              'Удахгүй дуусах гэж байна — дараагийн сарын төлбөрөө бэлдээрэй',
            ),
            PaidUntilState.ok => (
              AppIcons.calendarCheck,
              c.success,
              '$left хоног үлдсэн',
              'Бүх зүйл хэвийн. Хичээлдээ анхаараарай',
            ),
          };
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, size: 32, color: tone),
                  const SizedBox(width: AppSpace.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Хэдий хүртэл төлсөн', style: context.text.labelMedium?.copyWith(color: c.inkDim)),
                        Text(
                          paidUntil == null ? '–' : paidUntilLabel(paidUntil),
                          style: context.text.displaySmall?.copyWith(fontSize: 22),
                        ),
                        Text(title, style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpace.sm),
              Text(hint, style: context.text.bodySmall),
            ],
          );
        },
      ),
    );
  }
}

/// Төвийн мэдэгдэл — хоосон эсвэл алдаатай бол огт харагдахгүй (вэбтэй ижил: 404 бол нуух).
class AnnouncementsCard extends ConsumerStatefulWidget {
  const AnnouncementsCard({super.key});

  @override
  ConsumerState<AnnouncementsCard> createState() => _AnnouncementsCardState();
}

class _AnnouncementsCardState extends ConsumerState<AnnouncementsCard> {
  static const _maxVisible = 3;
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final list = ref.watch(announcementsProvider).value ?? const <Announcement>[];
    if (list.isEmpty) return const SizedBox.shrink();
    final visible = _expanded ? list : list.take(_maxVisible).toList();
    return Padding(
      padding: const EdgeInsets.only(top: AppSpace.md),
      child: SectionCard(
        icon: AppIcons.megaphone,
        title: 'Төвийн мэдэгдэл',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final a in visible) ...[_AnnouncementTile(a: a), const SizedBox(height: AppSpace.sm)],
            if (list.length > _maxVisible)
              OutlinedButton(
                onPressed: () => setState(() => _expanded = !_expanded),
                child: Text(_expanded ? 'Бага харуулах' : 'Бүгдийг харах (${list.length})'),
              ),
          ],
        ),
      ),
    );
  }
}

class _AnnouncementTile extends StatelessWidget {
  const _AnnouncementTile({required this.a});

  final Announcement a;

  @override
  Widget build(BuildContext context) {
    final created = parseApiInstant(a.createdAt);
    return Container(
      padding: const EdgeInsets.all(AppSpace.md),
      decoration: BoxDecoration(
        border: Border.all(color: context.colors.line),
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (a.pinned) ...[
                Semantics(
                  label: 'Зангиатай',
                  child: Icon(AppIcons.pin, size: 14, color: context.colors.brandSoft),
                ),
                const SizedBox(width: 6),
              ],
              Expanded(child: Text(a.title, style: context.text.titleSmall)),
              if (created != null) Text(DateMn.numeric(UbDateTime.fromInstant(created)), style: context.text.bodySmall),
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          Text(a.body, style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim)),
        ],
      ),
    );
  }
}
