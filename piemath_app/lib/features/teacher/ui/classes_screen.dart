import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/format/person_name.dart';
import '../../../core/ui/ui.dart';
import '../application/teacher_providers.dart';
import '../data/teacher_models.dart';
import 'teacher_widgets.dart';

/// Ангиуд (`/app/classes`). Багш бүх идэвхтэй ангийг харна; «Миний анги» = ахлах эсвэл туслах багш нь би.
class ClassesScreen extends ConsumerStatefulWidget {
  const ClassesScreen({super.key});

  @override
  ConsumerState<ClassesScreen> createState() => _ClassesScreenState();
}

class _ClassesScreenState extends ConsumerState<ClassesScreen> {
  bool _mineOnly = true;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(classroomsProvider);
    final me = ref.watch(teacherUserIdProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Ангиуд')),
      body: async.when(
        skipLoadingOnRefresh: false,
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          message: errorText(e, 'Ангийн жагсаалт нээгдсэнгүй'),
          onRetry: () => ref.invalidate(classroomsProvider),
        ),
        data: (all) {
          final mine = me == null ? const <ClassroomSummary>[] : all.where((c) => c.isMine(me)).toList();
          final showMine = _mineOnly && mine.isNotEmpty;
          final list = showMine ? mine : all;
          return RefreshIndicator(
            onRefresh: () => ref.refresh(classroomsProvider.future).then((_) {}, onError: (_) {}),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
              children: [
                if (mine.isNotEmpty) ...[
                  SegmentedButton<bool>(
                    segments: [
                      ButtonSegment(value: true, label: Text('Миний анги (${mine.length})')),
                      ButtonSegment(value: false, label: Text('Бүгд (${all.length})')),
                    ],
                    selected: {showMine},
                    showSelectedIcon: false,
                    onSelectionChanged: (s) => setState(() => _mineOnly = s.first),
                  ),
                  const SizedBox(height: AppSpace.md),
                ],
                if (list.isEmpty)
                  const SizedBox(
                    height: 280,
                    child: EmptyState(icon: AppIcons.myClass, title: 'Идэвхтэй анги алга'),
                  )
                else
                  for (final cls in list) ...[_ClassTile(cls: cls), const SizedBox(height: AppSpace.sm)],
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

  final ClassroomSummary cls;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final t = cls.teacher;
    final a = cls.assistantTeacher;
    return AppCard(
      onTap: () => context.push('/app/classes/${Uri.encodeComponent(cls.id)}'),
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
                      Icon(AppIcons.laptop, size: 16, color: c.inkDim),
                    ],
                  ],
                ),
                const SizedBox(height: AppSpace.xs),
                Meta(
                  items: [
                    classTypeLabel(cls.type),
                    if (cls.grade != null) '${cls.grade}-р анги',
                    '${cls.studentCount} сурагч',
                  ],
                ),
                if (t != null || a != null) ...[
                  const SizedBox(height: AppSpace.xs),
                  Meta(
                    style: context.text.bodySmall?.copyWith(color: c.inkDim),
                    items: [
                      if (t != null) staffName(firstName: t.firstName, lastName: t.lastName, role: t.role),
                      if (a != null) 'Туслах: ${staffName(firstName: a.firstName, lastName: a.lastName, role: a.role)}',
                    ],
                  ),
                ],
              ],
            ),
          ),
          Icon(AppIcons.forward, color: c.inkDim),
        ],
      ),
    );
  }
}

/// Ангийн самбар (`/app/classes/:id`): өнөөдрийн ирц/даалгавар руу, онлайн даалгавар, сурагчдын жагсаалт.
class ClassDetailScreen extends ConsumerWidget {
  const ClassDetailScreen({super.key, required this.classId});

  final String classId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(classroomDetailProvider(classId));
    final today = ref.watch(teacherTodayProvider).dateKey;
    final c = context.colors;
    return Scaffold(
      appBar: AppBar(title: Text(async.value?.classroom.name ?? 'Анги')),
      body: async.when(
        skipLoadingOnRefresh: false,
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          message: errorText(e, 'Ангийн мэдээлэл нээгдсэнгүй'),
          onRetry: () => ref.invalidate(classroomDetailProvider(classId)),
        ),
        data: (d) {
          final names = rosterNames([
            for (final s in d.students) (id: s.id, firstName: s.firstName, lastName: s.lastName, role: null),
          ]);
          final students = [...d.students]..sort((a, b) => (names[a.id] ?? '').compareTo(names[b.id] ?? ''));
          return RefreshIndicator(
            onRefresh: () => ref.refresh(classroomDetailProvider(classId).future).then((_) {}, onError: (_) {}),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
              children: [
                Meta(
                  items: [
                    classTypeLabel(d.classroom.type),
                    if (d.classroom.grade != null) '${d.classroom.grade}-р анги',
                    '${d.students.length} сурагч',
                  ],
                ),
                const SizedBox(height: AppSpace.md),
                FilledButton.icon(
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(teacherTap)),
                  onPressed: () => context.push('/app/teacher/board/${Uri.encodeComponent(classId)}?date=$today'),
                  icon: const Icon(AppIcons.exam),
                  label: const Text('Өнөөдрийн ирц, даалгавар'),
                ),
                if (d.classroom.isOnline) ...[
                  const SizedBox(height: AppSpace.sm),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(teacherTap)),
                    onPressed: () => context.push('/app/classes/${Uri.encodeComponent(classId)}/assignments'),
                    icon: const Icon(AppIcons.laptop),
                    label: const Text('Онлайн даалгавар шалгах'),
                  ),
                ],
                const SizedBox(height: AppSpace.lg),
                const SectionHeader(title: 'Сурагчид', padding: EdgeInsets.zero),
                const SizedBox(height: AppSpace.sm),
                if (students.isEmpty)
                  const AppCard(
                    child: EmptyState(icon: AppIcons.students, title: 'Энэ ангид сурагч алга'),
                  )
                else
                  AppCard(
                    padding: EdgeInsets.zero,
                    child: Column(
                      children: [
                        for (final (i, s) in students.indexed) ...[
                          if (i > 0) Divider(height: 1, color: c.line),
                          ListTile(
                            minTileHeight: 56,
                            title: Text(names[s.id] ?? s.firstName),
                            subtitle: s.studentCode == null ? null : Text(s.studentCode!),
                            trailing: Icon(AppIcons.forward, color: c.inkDim),
                            onTap: () => context.push('/app/students/${Uri.encodeComponent(s.id)}', extra: names[s.id]),
                          ),
                        ],
                      ],
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
