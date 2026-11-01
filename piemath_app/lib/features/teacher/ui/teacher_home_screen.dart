import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../application/teacher_providers.dart';
import '../data/teacher_models.dart';
import 'teacher_widgets.dart';

/// Багшийн самбар (`/app/teacher`): сонгосон өдрийн хичээлтэй ангиуд. Хуваарийн онцгой өдөр
/// (цуцалсан, зөөсөн, амралт) серверт тооцогдсон `/attendance/board`-оос.
class TeacherHomeScreen extends ConsumerStatefulWidget {
  const TeacherHomeScreen({super.key});

  @override
  ConsumerState<TeacherHomeScreen> createState() => _TeacherHomeScreenState();
}

class _TeacherHomeScreenState extends ConsumerState<TeacherHomeScreen> {
  UbDateTime? _date;

  @override
  Widget build(BuildContext context) {
    final today = ref.watch(teacherTodayProvider).startOfDay;
    final date = _date ?? today;
    final key = date.dateKey;
    final async = ref.watch(dayBoardProvider(key));
    return Scaffold(
      appBar: AppBar(title: const Text('Багшийн самбар')),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(dayBoardProvider(key).future).then((_) {}, onError: (_) {}),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
          children: [
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
                      const SizedBox(
                        height: 280,
                        child: EmptyState(icon: AppIcons.calendar, title: 'Энэ өдөр хичээлтэй анги алга'),
                      ),
                    ]
                  : [
                      for (final cls in b.classes) ...[
                        _ClassCard(cls: cls, date: key),
                        const SizedBox(height: AppSpace.sm),
                      ],
                    ],
            ),
            const SizedBox(height: AppSpace.lg),
            _Link(icon: AppIcons.myClass, label: 'Ангиуд', onTap: () => context.push('/app/classes')),
            const SizedBox(height: AppSpace.sm),
            _Link(icon: AppIcons.timer, label: 'Цагийн бүртгэл', onTap: () => context.push('/app/teacher-hours')),
          ],
        ),
      ),
    );
  }
}

class _ClassCard extends StatelessWidget {
  const _ClassCard({required this.cls, required this.date});

  final DayClass cls;
  final String date;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AppCard(
      accent: cls.mine ? c.brand : null,
      semanticLabel: cls.mine ? '${cls.name}, таны хичээл' : cls.name,
      onTap: () => context.push('/app/teacher/board/${Uri.encodeComponent(cls.id)}?date=$date'),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(child: Text(cls.name, style: context.text.titleMedium)),
                    if (cls.isOnline) ...[
                      const SizedBox(width: AppSpace.sm),
                      Icon(AppIcons.laptop, size: 16, color: c.inkDim, semanticLabel: 'Онлайн'),
                    ],
                  ],
                ),
                const SizedBox(height: AppSpace.xs),
                LessonMeta(lessons: cls.lessons, extra: ['${cls.studentCount} сурагч']),
              ],
            ),
          ),
          Icon(AppIcons.forward, color: c.inkDim),
        ],
      ),
    );
  }
}

class _Link extends StatelessWidget {
  const _Link({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => AppCard(
    padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
    onTap: onTap,
    child: Row(
      children: [
        Icon(icon, color: context.colors.brand),
        const SizedBox(width: AppSpace.md),
        Expanded(child: Text(label, style: context.text.bodyLarge)),
        Icon(AppIcons.forward, color: context.colors.inkDim),
      ],
    ),
  );
}
