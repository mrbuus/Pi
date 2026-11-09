import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/session.dart';
import '../../../core/format/person_name.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../application/teacher_providers.dart';
import '../data/teacher_models.dart';
import '../domain/board_logic.dart';
import 'attention_students_banner.dart';
import 'teacher_widgets.dart';

/// Багшийн самбар (`/app/teacher`): сонгосон өдрийн хичээлтэй ангиуд. Хуваарийн онцгой өдөр
/// (цуцалсан, зөөсөн, амралт) серверт тооцогдсон `/attendance/board`-оос.
class TeacherHomeScreen extends ConsumerStatefulWidget {
  const TeacherHomeScreen({super.key, this.date});

  /// `YYYY-MM-DD` (UB) — мэдэгдлийн холбоосоос; null бол өнөөдөр.
  final String? date;

  @override
  ConsumerState<TeacherHomeScreen> createState() => _TeacherHomeScreenState();
}

class _TeacherHomeScreenState extends ConsumerState<TeacherHomeScreen> {
  late UbDateTime? _date = parseDateKey(widget.date);

  @override
  Widget build(BuildContext context) {
    final today = ref.watch(teacherTodayProvider).startOfDay;
    final date = _date ?? today;
    final key = date.dateKey;
    final async = ref.watch(dayBoardProvider(key));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Багшийн самбар'),
        actions: [
          // Админ: удирдлагын хуудсууд нэг товчоор (эзэн 2026-11-04)
          if (ref.watch(isAdminProvider))
            Padding(
              padding: const EdgeInsets.only(right: AppSpace.sm),
              child: TextButton.icon(
                onPressed: () => context.push('/app/admin'),
                icon: const Icon(AppIcons.settings, size: 20),
                label: const Text('Удирдлага'),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(dayBoardProvider(key).future).then((_) {}, onError: (_) {}),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.xs, AppSpace.gutter, AppSpace.xxl),
          children: [
            const _StaffGreeting(),
            const SizedBox(height: AppSpace.md),
            if (ref.watch(canManageProvider)) const AttentionStudentsBanner(),
            DayStepper(date: date, today: today, onChanged: (d) => setState(() => _date = d)),
            const SizedBox(height: AppSpace.sm),
            ...async.when(
              skipLoadingOnRefresh: false,
              loading: () => [const LoadingState(cards: 3, padding: EdgeInsets.zero)],
              error: (e, _) => [
                SizedBox(
                  height: 320,
                  child: ErrorState(
                    message: errorText(e, 'Хичээлийн жагсаалт нээгдсэнгүй'),
                    onRetry: () => ref.invalidate(dayBoardProvider(key)),
                  ),
                ),
              ],
              data: (b) => b.classes.isEmpty
                  ? [
                      const AppCard(
                        child: SizedBox(
                          height: 200,
                          child: EmptyState(icon: AppIcons.calendar, title: 'Энэ өдөр хичээлтэй анги алга'),
                        ),
                      ),
                    ]
                  : [
                      _DaySummary(classes: b.classes),
                      const SizedBox(height: AppSpace.md),
                      for (final cls in b.classes) ...[
                        _ClassCard(cls: cls, date: key),
                        const SizedBox(height: AppSpace.md),
                      ],
                    ],
            ),
            const SectionHeader(
              title: 'Хэрэгсэл',
              padding: EdgeInsets.only(top: AppSpace.md, bottom: AppSpace.sm),
            ),
            ListGroup(
              dividerIndent: AppSpace.lg + 36 + AppSpace.md,
              children: [
                _Link(icon: AppIcons.myClass, label: 'Ангиуд', onTap: () => context.push('/app/classes')),
                _Link(
                  icon: AppIcons.timer,
                  hue: AppHue.teal,
                  label: 'Цагийн бүртгэл',
                  onTap: () => context.push('/app/teacher-hours'),
                ),
                _Link(
                  icon: AppIcons.megaphone,
                  hue: AppHue.info,
                  label: 'Зар тавих',
                  onTap: () => context.push('/app/teacher/announcements'),
                ),
                if (ref.watch(canManageProvider)) ...[
                  _Link(
                    icon: AppIcons.checklist,
                    hue: AppHue.violet,
                    label: 'Хүлээгдэж буй',
                    onTap: () => context.push('/app/teacher/pending'),
                  ),
                  _Link(
                    icon: AppIcons.enroll,
                    hue: AppHue.teal,
                    label: 'Элсэлтийн хүсэлт',
                    onTap: () => context.push('/app/admin/leads'),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Мэндчилгээ: нэр (Багш+ бол «+»).
class _StaffGreeting extends ConsumerWidget {
  const _StaffGreeting();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final user = session is SignedIn ? session.user : null;
    if (user == null) return const SizedBox.shrink();
    final first = user.firstName.trim();
    final last = user.lastName?.trim() ?? '';
    final initials = [first, last].where((s) => s.isNotEmpty).map((s) => s.substring(0, 1).toUpperCase()).join();
    final role = session is SignedIn ? session.auth.role.apiValue : null;
    return GreetingHeader(
      name: withPlus(first.isEmpty ? AppStrings.appName : first, role),
      leading: InitialsAvatar(initials: initials, size: 48),
    );
  }
}

/// Өдрийн товч тоо: хэдэн анги, хэдэн сурагч, үүнээс таны хичээл.
class _DaySummary extends StatelessWidget {
  const _DaySummary({required this.classes});

  final List<DayClass> classes;

  @override
  Widget build(BuildContext context) {
    final students = classes.fold<int>(0, (a, c) => a + c.studentCount);
    final mine = classes.where((c) => c.mine).length;
    return AppCard(
      padding: const EdgeInsets.symmetric(vertical: AppSpace.md),
      semanticLabel: '${classes.length} анги, $students сурагч, таны хичээл $mine',
      child: ExcludeSemantics(
        child: IntrinsicHeight(
          child: Row(
            children: [
              Expanded(
                child: _Figure(value: classes.length, label: 'Анги'),
              ),
              VerticalDivider(width: 1, color: context.colors.line),
              Expanded(
                child: _Figure(value: students, label: 'Сурагч'),
              ),
              VerticalDivider(width: 1, color: context.colors.line),
              Expanded(
                child: _Figure(value: mine, label: 'Таны хичээл'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Figure extends StatelessWidget {
  const _Figure({required this.value, required this.label});

  final int value;
  final String label;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text('$value', style: context.text.displaySmall?.copyWith(fontSize: 22)),
      const SizedBox(height: 2),
      Text(label, style: context.text.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
    ],
  );
}

class _ClassCard extends StatelessWidget {
  const _ClassCard({required this.cls, required this.date});

  final DayClass cls;
  final String date;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lesson = cls.lessons.firstOrNull;
    return AppCard(
      semanticLabel: cls.mine ? '${cls.name}, таны хичээл' : cls.name,
      padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.sm, AppSpace.md),
      onTap: () => context.push('/app/teacher/board/${Uri.encodeComponent(cls.id)}?date=$date'),
      child: Row(
        children: [
          // Эхлэх цаг — жагсаалтыг цагаар нь нүдээр гүйлгэхэд.
          SizedBox(
            width: 64,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  lesson == null ? '–' : hm(lesson.startMinute),
                  style: context.text.displaySmall?.copyWith(fontSize: 16, color: cls.mine ? c.brand : c.ink),
                  maxLines: 1,
                  softWrap: false,
                ),
                if (lesson != null) Text(hm(lesson.endMinute), style: context.text.bodySmall),
              ],
            ),
          ),
          Container(
            width: 3,
            height: 40,
            margin: const EdgeInsetsDirectional.only(end: AppSpace.md),
            decoration: BoxDecoration(
              color: cls.mine ? c.brand : c.line,
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(cls.name, style: context.text.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                    ),
                    if (cls.isOnline) ...[
                      const SizedBox(width: AppSpace.sm),
                      Icon(AppIcons.laptop, size: 16, color: c.inkDim, semanticLabel: 'Онлайн'),
                    ],
                    if (cls.mine) ...[
                      const SizedBox(width: AppSpace.sm),
                      const Flexible(
                        child: TonePill(label: 'Таны хичээл', hue: AppHue.brand),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                // Цаг зүүн баганад тул энд давтахгүй.
                Meta(
                  items: [
                    if (lesson?.room != null && lesson!.room!.trim().isNotEmpty) '${lesson.room} тоот',
                    if (lesson?.topic != null && lesson!.topic!.trim().isNotEmpty) lesson.topic,
                    '${cls.studentCount} сурагч',
                  ],
                ),
              ],
            ),
          ),
          Icon(AppIcons.forward, size: 18, color: c.inkDim),
        ],
      ),
    );
  }
}

class _Link extends StatelessWidget {
  const _Link({required this.icon, required this.label, required this.onTap, this.hue = AppHue.brand});

  final IconData icon;
  final String label;
  final AppHue hue;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => ListRow(
    leading: IconTile(icon, hue: hue, size: 36),
    title: label,
    onTap: onTap,
  );
}
