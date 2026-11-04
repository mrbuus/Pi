import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/groups_models.dart';
import '../data/groups_repository.dart';
import 'group_detail_screen.dart';

/// Ангийн бүлэг (`/app/groups`, вэбийн `app/groups/page.tsx`).
///
/// - Гадны багш (Багш, Багш+ эрхтэй, `GROUP_TEACHER` цэс): өөрийн бүлгүүд, шинэ бүлэг үүсгэх, дэлгэрэнгүй
///   (таблетад баруун талд). Архивлах нь «Буцаах»-тай — 5 секундын дараа серверт.
/// - Сурагч, худалдан авагч: багшаас авсан кодоор нэгдэх.
class GroupsScreen extends ConsumerWidget {
  const GroupsScreen({super.key});

  static const path = '/app/groups';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final role = session is SignedIn ? session.role : UserRole.unknown;
    final teacher = role == UserRole.teacher || role == UserRole.teacherPlus || role == UserRole.groupTeacher;
    final joiner = role == UserRole.student || role == UserRole.buyer;
    if (teacher) return const _TeacherGroups();
    return Scaffold(
      appBar: AppBar(title: const Text('Ангийн бүлэг')),
      body: joiner
          ? const _JoinView()
          : const EmptyState(
              icon: AppIcons.students,
              title: 'Энэ хэсэг гадны багш, сурагчид',
              message: 'Багш бүлэг үүсгэж, сурагчид кодоор нэгдэнэ',
            ),
    );
  }
}

class _TeacherGroups extends ConsumerStatefulWidget {
  const _TeacherGroups();

  @override
  ConsumerState<_TeacherGroups> createState() => _TeacherGroupsState();
}

class _TeacherGroupsState extends ConsumerState<_TeacherGroups> {
  final _list = DataListController<TeacherGroup>();

  Future<void> _create() async {
    final repo = ref.read(groupsRepositoryProvider);
    final created = await showFormSheet<TeacherGroup>(
      context,
      title: 'Шинэ ангийн бүлэг',
      subtitle: 'Үүсгэсний дараа сурагчид кодоор нэгдэнэ',
      submitLabel: 'Үүсгэх',
      fields: const [
        FormTextField(name: 'name', label: 'Бүлгийн нэр', hint: 'Жишээ нь 12-2 анги', required: true, maxLength: 255),
      ],
      onSubmit: (v) => repo.create(v.text('name')),
    );
    if (created == null || !mounted) return;
    _list.insert(0, created);
    unawaited(context.push('${GroupsScreen.path}/${created.id}'));
  }

  Future<void> _open(TeacherGroup g) async {
    final result = await context.push<String>('${GroupsScreen.path}/${g.id}');
    if (!mounted) return;
    if (result == GroupDetailView.archived) {
      await _archive(g);
    } else {
      // Гишүүн хассан бол тоо өөрчлөгдөнө.
      unawaited(_list.refresh());
    }
  }

  /// Жагсаалтаас шууд нууж, «Буцаах» дарахгүй бол серверт архивлана.
  Future<void> _archive(TeacherGroup g) async {
    final removed = _list.removeWhere((x) => x.id == g.id);
    if (removed == null) return;
    if (await showUndoSnack(context, message: '«${g.name}» архивлагдлаа')) {
      _list.insert(removed.index, removed.item);
      return;
    }
    try {
      await ref.read(groupsRepositoryProvider).archive(g.id);
    } catch (e) {
      _list.insert(removed.index, removed.item);
      if (mounted) {
        ScaffoldMessenger.maybeOf(context)
            ?.showSnackBar(SnackBar(content: Text(e is ApiError ? e.message : MutationResult.saveFailedMessage)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Анги удирдах'),
        actions: [IconButton(tooltip: 'Шинэ бүлэг', icon: const Icon(AppIcons.add), onPressed: _create)],
      ),
      body: DataListScreen<TeacherGroup>(
        controller: _list,
        load: (q) async => DataPage.local(
          await ref.read(groupsRepositoryProvider).myGroups(),
          q,
          matches: (g, text) => g.name.toLowerCase().contains(text) || g.joinCode.toLowerCase().contains(text),
        ),
        itemKey: (g) => g.id,
        searchHint: 'Нэр, кодоор хайх',
        countLabel: (n) => '$n бүлэг',
        itemBuilder: (_, g) => ItemRow(
          title: g.name,
          meta: ['${g.memberCount} сурагч', if (g.createdAt != null) DateMn.long(g.createdAt!, withYear: true)],
          trailing: _CodeChip(code: g.joinCode),
          chevron: true,
        ),
        onTap: (g) => unawaited(_open(g)),
        detailBuilder: (_, g) => GroupDetailView(
          key: ValueKey('group:${g.id}'),
          groupId: g.id,
          onArchive: () => unawaited(_archive(g)),
          onChanged: () => unawaited(_list.refresh()),
        ),
        emptyIcon: AppIcons.students,
        emptyTitle: 'Ангийн бүлэг алга',
        emptyMessage: 'Бүлэг үүсгээд кодыг сурагчдадаа өгнө',
        emptyAction: FilledButton.icon(
          onPressed: _create,
          icon: const Icon(AppIcons.add, size: 18),
          label: const Text('Шинэ бүлэг үүсгэх'),
        ),
      ),
    );
  }
}

class _CodeChip extends StatelessWidget {
  const _CodeChip({required this.code});

  final String code;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: AppSpace.xs),
    decoration: BoxDecoration(color: context.colors.surfaceSunken, borderRadius: BorderRadius.circular(AppRadius.sm)),
    child: Text(
      code,
      style: context.text.labelLarge?.copyWith(fontFeatures: const [FontFeature.tabularFigures()], letterSpacing: 1),
    ),
  );
}

/// Сурагч, худалдан авагч: кодоор нэгдэх.
class _JoinView extends ConsumerWidget {
  const _JoinView();

  Future<void> _join(BuildContext context, WidgetRef ref) async {
    final repo = ref.read(groupsRepositoryProvider);
    final joined = await showFormSheet<String>(
      context,
      title: 'Ангийн бүлэгт нэгдэх',
      subtitle: 'Багшаас авсан кодоо оруулна',
      submitLabel: 'Нэгдэх',
      fields: const [
        FormTextField(
          name: 'code',
          label: 'Нэгдэх код',
          hint: 'Жишээ нь ABC1234',
          required: true,
          maxLength: 8,
          validator: joinCodeError,
        ),
      ],
      onSubmit: (v) => repo.join(v.text('code')),
    );
    if (joined == null || !context.mounted) return;
    ScaffoldMessenger.maybeOf(context)
      ?..hideCurrentSnackBar()
      ..showSnackBar(const SnackBar(content: Text('Бүлэгт нэгдлээ, багш таны дүнг харна')));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) => CustomScrollView(
    slivers: [
      SliverFillRemaining(
        hasScrollBody: false,
        child: EmptyState(
          icon: AppIcons.students,
          title: 'Багшийн бүлэгт нэгдэх',
          message: 'Гадны багш 6–8 тэмдэгттэй код өгнө, нэгдсэнээс хойшх шалгалтын дүнг тань харна',
          action: FilledButton.icon(
            onPressed: () => unawaited(_join(context, ref)),
            icon: const Icon(AppIcons.key, size: 18),
            label: const Text('Кодоор нэгдэх'),
          ),
        ),
      ),
    ],
  );
}
