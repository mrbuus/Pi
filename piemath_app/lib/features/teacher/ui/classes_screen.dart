import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../application/staff_providers.dart';
import '../application/teacher_providers.dart';
import '../data/class_dashboard_models.dart';
import '../data/teacher_models.dart';
import 'class_codes_tab.dart';
import 'class_dashboard_tabs.dart';
import 'staff_widgets.dart';

enum _Sort { name, risk, attendance }

/// Ангиуд (`/app/classes`). Вэбтэй ижил `GET /class-dashboard`: тоо, төлөв, анхаарах сурагч сервер тооцно.
/// «Миний анги» = ахлах эсвэл туслах багш нь би.
class ClassesScreen extends ConsumerStatefulWidget {
  const ClassesScreen({super.key});

  @override
  ConsumerState<ClassesScreen> createState() => _ClassesScreenState();
}

class _ClassesScreenState extends ConsumerState<ClassesScreen> {
  bool _mineOnly = true;
  String _query = '';
  _Sort _sort = _Sort.name;

  static int _byName(DashClass a, DashClass b) => a.name.toLowerCase().compareTo(b.name.toLowerCase());

  List<DashClass> _shown(List<DashClass> list) {
    final out = list.where((c) => c.matches(_query)).toList();
    out.sort(switch (_sort) {
      _Sort.name => _byName,
      _Sort.risk => (a, b) => b.riskCount != a.riskCount ? b.riskCount - a.riskCount : _byName(a, b),
      _Sort.attendance => (a, b) {
        final d = (a.attendanceRate ?? 101) - (b.attendanceRate ?? 101);
        return d != 0 ? d : _byName(a, b);
      },
    });
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(classDashboardProvider);
    final me = ref.watch(teacherUserIdProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Ангиуд')),
      body: async.when(
        skipLoadingOnRefresh: false,
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          message: errorText(e, 'Ангийн жагсаалт нээгдсэнгүй'),
          onRetry: () => ref.invalidate(classDashboardProvider),
        ),
        data: (d) {
          final mine = me == null ? const <DashClass>[] : d.classes.where((c) => c.isMine(me)).toList();
          final showMine = _mineOnly && mine.isNotEmpty;
          final list = _shown(showMine ? mine : d.classes);
          return RefreshIndicator(
            onRefresh: () => ref.refresh(classDashboardProvider.future).then((_) {}, onError: (_) {}),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
              children: [
                Meta(
                  items: [
                    '${d.classes.length} анги',
                    '${d.studentTotal} сурагч',
                    if (d.riskTotal > 0) '${d.riskTotal} анхаарах',
                  ],
                ),
                const SizedBox(height: AppSpace.sm),
                if (mine.isNotEmpty) ...[
                  SegmentedButton<bool>(
                    segments: [
                      ButtonSegment(value: true, label: Text('Миний анги (${mine.length})')),
                      ButtonSegment(value: false, label: Text('Бүгд (${d.classes.length})')),
                    ],
                    selected: {showMine},
                    showSelectedIcon: false,
                    onSelectionChanged: (s) => setState(() => _mineOnly = s.first),
                  ),
                  const SizedBox(height: AppSpace.md),
                ],
                TextField(
                  decoration: const InputDecoration(
                    prefixIcon: Icon(AppIcons.search),
                    hintText: 'Анги, багш хайх',
                    isDense: true,
                  ),
                  onChanged: (v) => setState(() => _query = v),
                ),
                const SizedBox(height: AppSpace.sm),
                SegmentedButton<_Sort>(
                  segments: const [
                    ButtonSegment(value: _Sort.name, label: Text('Нэрээр')),
                    ButtonSegment(value: _Sort.risk, label: Text('Анхаарах')),
                    ButtonSegment(value: _Sort.attendance, label: Text('Ирц сул')),
                  ],
                  selected: {_sort},
                  showSelectedIcon: false,
                  onSelectionChanged: (s) => setState(() => _sort = s.first),
                ),
                const SizedBox(height: AppSpace.md),
                if (d.classes.isEmpty)
                  const SizedBox(
                    height: 280,
                    child: EmptyState(
                      icon: AppIcons.myClass,
                      title: 'Танд харагдах анги алга',
                      message: 'Хуваарьт таныг багшаар оноосон үед энд гарна',
                    ),
                  )
                else if (list.isEmpty)
                  const SizedBox(
                    height: 200,
                    child: EmptyState(icon: AppIcons.search, title: 'Хайлтад тохирох анги алга'),
                  )
                else ...[
                  for (final cls in list) ...[_ClassTile(cls: cls), const SizedBox(height: AppSpace.sm)],
                  Text(
                    'Ирц, даалгавар нь сүүлийн ${d.windowDays} хоногийнх',
                    style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ClassTile extends StatelessWidget {
  const _ClassTile({required this.cls});

  final DashClass cls;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final pay = cls.payment;
    final payTotal = pay == null ? 0 : pay.values.fold(0, (s, n) => s + n);
    final teachers = [cls.classTeacher, cls.assistantTeacher].whereType<String>().toList();
    return AppCard(
      onTap: () => context.push('/app/classes/${Uri.encodeComponent(cls.id)}'),
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
              const Spacer(),
              Icon(AppIcons.forward, color: c.inkDim),
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          Meta(
            style: context.text.bodySmall?.copyWith(color: c.inkDim),
            items: [
              '${cls.students} сурагч',
              teachers.isEmpty
                  ? (cls.teachers.isEmpty ? 'Багш оноогоогүй' : cls.teachers.take(2).join(', '))
                  : teachers.join(', '),
            ],
          ),
          if (cls.lastLessonDate != null) ...[
            const SizedBox(height: AppSpace.xs),
            Text(
              'Сүүлийн хичээл ${cls.lastLessonDate}${cls.lastLessonTopic == null ? '' : ', ${cls.lastLessonTopic}'}',
              style: context.text.bodySmall?.copyWith(color: c.inkDim),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: AppSpace.md),
          Wrap(
            spacing: AppSpace.xl,
            runSpacing: AppSpace.md,
            children: [
              StatTile(label: 'Ирц', value: pct(cls.attendanceRate)),
              StatTile(label: 'Даалгавар', value: pct(cls.homeworkRate)),
              StatTile(label: 'Шалгалт', value: cls.examAvg == null ? (cls.examCount > 0 ? 'Дүн алга' : '-') : '${cls.examAvg}%'),
              StatTile(
                label: 'Анхаарах',
                value: '${cls.riskCount}',
                icon: cls.riskCount > 0 ? AppIcons.warning : null,
                color: c.error,
              ),
              if (pay != null && payTotal > 0) StatTile(label: 'Энэ сар төлсөн', value: '${pay[PayState.paid] ?? 0}/$payTotal'),
            ],
          ),
        ],
      ),
    );
  }
}

/// Ангийн самбар (`/app/classes/:id`): вэбтэй ижил `GET /class-dashboard/classes/:id`.
/// «Тойм», «Сурагчид», «Код», «Нөхөх».
class ClassDetailScreen extends ConsumerWidget {
  const ClassDetailScreen({super.key, required this.classId});

  final String classId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(classDashboardDetailProvider(classId));
    final today = ref.watch(teacherTodayProvider).dateKey;
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: Text(async.value?.name ?? 'Анги'),
          bottom: const TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [Tab(text: 'Тойм'), Tab(text: 'Сурагчид'), Tab(text: 'Код'), Tab(text: 'Нөхөх')],
          ),
        ),
        body: async.when(
          skipLoadingOnRefresh: false,
          loading: () => const LoadingState(),
          error: (e, _) => ErrorState(
            message: errorText(e, 'Ангийн мэдээлэл нээгдсэнгүй'),
            onRetry: () => ref.invalidate(classDashboardDetailProvider(classId)),
          ),
          data: (d) {
            Future<void> refresh() =>
                ref.refresh(classDashboardDetailProvider(classId).future).then((_) {}, onError: (_) {});
            return TabBarView(
              children: [
                ClassOverviewTab(detail: d, today: today, onRefresh: refresh),
                ClassStudentsTab(detail: d, onRefresh: refresh),
                ClassCodesTab(
                  students: [
                    for (final s in d.students)
                      RosterStudent(id: s.id, firstName: s.firstName, lastName: s.lastName, studentCode: s.studentCode),
                  ],
                ),
                ClassMakeupTab(classId: classId, today: today),
              ],
            );
          },
        ),
      ),
    );
  }
}
