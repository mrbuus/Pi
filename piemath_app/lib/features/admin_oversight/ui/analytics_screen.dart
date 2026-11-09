import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/user_role.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/oversight_data.dart';

/// Аналитик (`/app/admin/analytics`, вэбийн `AnalyticsDashboard`) — Админ, Багш+. Сурагчдын идэвх (сурагчийн
/// тоо, бодсон бодлого — мөнгөн дүн байхгүй), ангиар оролцоо, сэдвээр амжилт, анхаарах сурагчид.
class AnalyticsScreen extends ConsumerStatefulWidget {
  const AnalyticsScreen({super.key});

  static const path = '/app/admin/analytics';

  @override
  ConsumerState<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends ConsumerState<AnalyticsScreen> {
  int _days = 30;
  int _tab = 0;
  late Future<_Data> _future = _fetch();

  Future<_Data> _fetch() async {
    final repo = ref.read(oversightRepositoryProvider);
    final to = ref.read(oversightTodayProvider).startOfDay;
    final from = to.addDays(-(_days - 1));
    final (o, c, t, r) = await (
      repo.overview(from, to),
      repo.classrooms(from, to),
      repo.topics(from, to),
      repo.atRisk(_days > 14 ? 14 : _days),
    ).wait;
    return _Data(o, c, t, r);
  }

  void _reload() => setState(() {
    _future = _fetch();
  });

  @override
  Widget build(BuildContext context) {
    final role = ref.watch(oversightRoleProvider);
    if (role != UserRole.admin && role != UserRole.teacherPlus) {
      return Scaffold(
        appBar: AppBar(title: const Text('Аналитик')),
        body: const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Аналитик')),
      body: FutureBuilder<_Data>(
        future: _future,
        builder: (context, snap) {
          if (snap.hasError) return ErrorState(onRetry: _reload);
          final d = snap.data;
          if (d == null) return const LoadingState();
          final o = d.overview;
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
              children: [
                SegmentedButton<int>(
                  segments: const [
                    ButtonSegment(value: 7, label: Text('7 хоног')),
                    ButtonSegment(value: 30, label: Text('30 хоног')),
                    ButtonSegment(value: 90, label: Text('90 хоног')),
                  ],
                  selected: {_days},
                  onSelectionChanged: (v) {
                    _days = v.first;
                    _reload();
                  },
                ),
                const SizedBox(height: AppSpace.md),
                StatRow(
                  tiles: [
                    StatTile(label: 'Өнөөдөр', value: '${o.dau}', icon: AppIcons.students, hint: 'идэвхтэй сурагч'),
                    StatTile(label: '7 хоногт', value: '${o.wau}'),
                    StatTile(label: '30 хоногт', value: '${o.mau}'),
                  ],
                ),
                const SizedBox(height: AppSpace.sm),
                StatRow(
                  tiles: [
                    StatTile(label: 'Бодсон бодлого', value: '${o.problemsAttempted}', icon: AppIcons.practice),
                    StatTile(
                      label: 'Дундаж хугацаа',
                      value: '${(o.avgSessionMs / 60000).round()} мин',
                      icon: AppIcons.timer,
                    ),
                  ],
                ),
                if (o.lowConfidence)
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpace.sm),
                    child: Text(
                      'Бүртгэл саяхан эхэлсэн тул тоо бүрэн биш байж болно',
                      style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                    ),
                  ),
                const SizedBox(height: AppSpace.md),
                SegmentedButton<int>(
                  segments: [
                    ButtonSegment(value: 0, label: Text('Анхаарах ${d.atRisk.length}')),
                    const ButtonSegment(value: 1, label: Text('Ангиуд')),
                    const ButtonSegment(value: 2, label: Text('Сэдэв')),
                  ],
                  selected: {_tab},
                  onSelectionChanged: (v) => setState(() => _tab = v.first),
                ),
                const SizedBox(height: AppSpace.sm),
                ...switch (_tab) {
                  0 => _atRisk(context, d.atRisk),
                  1 => _classes(context, d.classrooms),
                  _ => _topics(context, d.topics),
                },
              ],
            ),
          );
        },
      ),
    );
  }

  List<Widget> _atRisk(BuildContext context, List<AtRiskStudent> rows) => rows.isEmpty
      ? const [EmptyState(icon: AppIcons.success, title: 'Анхаарах сурагч алга')]
      : [
          for (final s in rows)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpace.sm),
              child: AppCard(
                onTap: () => context.push('/app/students/${Uri.encodeComponent(s.studentId)}', extra: s.name),
                child: ItemRow(
                  title: s.name,
                  meta: [
                    s.classroomName,
                    s.lastActiveAt == null
                        ? 'Идэвх бүртгэгдээгүй'
                        : 'Сүүлд: ${DateMn.numeric(UbDateTime.fromInstant(s.lastActiveAt!))}',
                    if (s.recent != null && s.prior != null) '${pct(s.prior!)} -> ${pct(s.recent!)}',
                  ],
                  subtitle: Wrap(
                    spacing: AppSpace.sm,
                    children: [
                      for (final r in s.reasons)
                        MetaChip(
                          label: r == 'INACTIVE' ? 'Идэвхгүй' : 'Амжилт буурч байна',
                          tone: r == 'INACTIVE' ? ChipTone.error : ChipTone.warning,
                        ),
                    ],
                  ),
                  chevron: true,
                ),
              ),
            ),
        ];

  List<Widget> _classes(BuildContext context, List<ClassroomActivity> rows) => rows.isEmpty
      ? const [EmptyState(icon: AppIcons.myClass, title: 'Мэдээлэл алга')]
      : [
          for (final c in rows)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpace.sm),
              child: AppCard(
                child: ItemRow(
                  title: c.name,
                  meta: [
                    '${c.active}/${c.enrolled} идэвхтэй',
                    'Сурагч бүр ${c.avgProblems.toStringAsFixed(1)} бодлого',
                  ],
                  trailing: Text(pct(c.participation), style: context.text.titleMedium),
                ),
              ),
            ),
        ];

  List<Widget> _topics(BuildContext context, List<TopicActivity> rows) {
    final sorted = [...rows]..sort((a, b) => a.success.compareTo(b.success));
    return sorted.isEmpty
        ? const [EmptyState(icon: AppIcons.theory, title: 'Мэдээлэл алга')]
        : [
            for (final t in sorted)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.sm),
                child: AppCard(
                  child: ItemRow(
                    title: t.title,
                    meta: [t.book, '${t.attempts} оролдлого', if (t.lowSample) 'цөөн тоо'],
                    trailing: Text(pct(t.success), style: context.text.titleMedium),
                  ),
                ),
              ),
          ];
  }
}

class _Data {
  const _Data(this.overview, this.classrooms, this.topics, this.atRisk);

  final AnalyticsOverview overview;
  final List<ClassroomActivity> classrooms;
  final List<TopicActivity> topics;
  final List<AtRiskStudent> atRisk;
}

/// Хэрэглээ (`/app/admin/usage`, вэбийн `UsageDashboard`) — Админ. Эрх тус бүрээр хэрэглэгч, хамгийн их нээгддэг
/// хуудас, дарагддаг товч, төхөөрөмж.
class UsageScreen extends ConsumerStatefulWidget {
  const UsageScreen({super.key});

  static const path = '/app/admin/usage';

  @override
  ConsumerState<UsageScreen> createState() => _UsageScreenState();
}

class _UsageScreenState extends ConsumerState<UsageScreen> {
  int _days = 7;
  late Future<List<RoleUsage>> _future = ref.read(oversightRepositoryProvider).usage(_days);

  void _reload() => setState(() {
    _future = ref.read(oversightRepositoryProvider).usage(_days);
  });

  @override
  Widget build(BuildContext context) {
    if (ref.watch(oversightRoleProvider) != UserRole.admin) {
      return Scaffold(
        appBar: AppBar(title: const Text('Хэрэглээ')),
        body: const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Хэрэглээ')),
      body: FutureBuilder<List<RoleUsage>>(
        future: _future,
        builder: (context, snap) {
          if (snap.hasError) return ErrorState(onRetry: _reload);
          final roles = snap.data;
          if (roles == null) return const LoadingState();
          return ListView(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
            children: [
              SegmentedButton<int>(
                segments: const [
                  ButtonSegment(value: 1, label: Text('Өнөөдөр')),
                  ButtonSegment(value: 7, label: Text('7 хоног')),
                  ButtonSegment(value: 30, label: Text('30 хоног')),
                ],
                selected: {_days},
                onSelectionChanged: (v) {
                  _days = v.first;
                  _reload();
                },
              ),
              if (roles.isEmpty) const EmptyState(icon: AppIcons.chart, title: 'Бүртгэл алга'),
              for (final r in roles) ...[
                SectionHeader(title: roleLabel(r.role)),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Meta(
                        items: [
                          '${r.users} хэрэглэгч',
                          '${r.events} үйлдэл',
                          for (final e in r.devices.entries)
                            '${e.key == 'mobile' ? 'Утас' : (e.key == 'desktop' ? 'Компьютер' : e.key)} ${e.value}',
                        ],
                      ),
                      const SizedBox(height: AppSpace.sm),
                      for (final p in r.pages.take(5))
                        Padding(
                          padding: const EdgeInsets.only(bottom: 2),
                          child: Row(
                            children: [
                              Expanded(child: Text(p.path, maxLines: 1, overflow: TextOverflow.ellipsis)),
                              Text('${p.views}', style: context.text.labelLarge),
                            ],
                          ),
                        ),
                      if (r.clicks.isNotEmpty) ...[
                        const SizedBox(height: AppSpace.sm),
                        Text('Их дарагддаг', style: context.text.labelMedium?.copyWith(color: context.colors.inkDim)),
                        for (final c in r.clicks.take(5))
                          Row(
                            children: [
                              Expanded(child: Text(c.target, maxLines: 1, overflow: TextOverflow.ellipsis)),
                              Text('${c.clicks}', style: context.text.labelLarge),
                            ],
                          ),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}
