import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/groups_models.dart';
import '../data/groups_repository.dart';

/// Бүлгийн дэлгэрэнгүй (`/app/groups/:groupId`, вэбийн `app/groups/[groupId]/page.tsx`).
class GroupDetailScreen extends ConsumerWidget {
  const GroupDetailScreen({super.key, required this.groupId});

  final String groupId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = ref.watch(groupDetailsProvider(groupId).select((a) => a.value?.name));
    return Scaffold(
      appBar: AppBar(title: Text(name ?? 'Ангийн бүлэг')),
      body: GroupDetailView(
        groupId: groupId,
        onArchive: () async {
          if (context.canPop()) {
            // Жагсаалт «Буцаах»-тай архивлана.
            context.pop(GroupDetailView.archived);
            return;
          }
          // Гаднаас (push, холбоос) нээсэн — буцах жагсаалтгүй тул шууд.
          try {
            await ref.read(groupsRepositoryProvider).archive(groupId);
            if (context.mounted) context.go('/app/groups');
          } catch (e) {
            if (context.mounted) {
              ScaffoldMessenger.maybeOf(context)
                  ?.showSnackBar(SnackBar(content: Text(e is ApiError ? e.message : MutationResult.saveFailedMessage)));
            }
          }
        },
      ),
    );
  }
}

/// Дэлгэрэнгүйн бие — утсанд тусдаа дэлгэц, таблетад жагсаалтын баруун талд.
///
/// Сурагч хасах нь шууд харагдаж, 5 секундын «Буцаах»-ын дараа серверт (зөөлөн, `leftAt`) илгээгдэнэ.
class GroupDetailView extends ConsumerStatefulWidget {
  const GroupDetailView({super.key, required this.groupId, required this.onArchive, this.onChanged});

  /// Дэлгэц хаагдахдаа буцаах утга — жагсаалт архивлана.
  static const archived = 'archived';

  final String groupId;

  /// Архивлахыг баталсны дараа.
  final FutureOr<void> Function() onArchive;

  /// Гишүүн хасагдсаны дараа (жагсаалтын тоо шинэчлэх).
  final VoidCallback? onChanged;

  @override
  ConsumerState<GroupDetailView> createState() => _GroupDetailViewState();
}

class _GroupDetailViewState extends ConsumerState<GroupDetailView> {
  /// «Буцаах» хүлээж буй (харагдахгүй) гишүүд.
  final _hidden = <String>{};

  Future<void> _remove(GroupMember m) async {
    if (!await confirmAction(
      context,
      title: '${m.name}-г бүлгээс хасах уу',
      message: 'Өмнөх дүн хадгалагдана, дахин кодоор нэгдэж болно',
      confirmLabel: 'Хасах',
    )) {
      return;
    }
    if (!mounted) return;
    setState(() => _hidden.add(m.studentId));
    final messenger = ScaffoldMessenger.maybeOf(context);
    final undone = await showUndoSnack(context, message: '${m.name} бүлгээс хасагдлаа');
    if (undone) {
      if (mounted) setState(() => _hidden.remove(m.studentId));
      return;
    }
    try {
      await ref.read(groupsRepositoryProvider).removeStudent(widget.groupId, m.studentId);
      ref.invalidate(groupDetailsProvider(widget.groupId));
      widget.onChanged?.call();
    } catch (e) {
      if (mounted) setState(() => _hidden.remove(m.studentId));
      messenger?.showSnackBar(SnackBar(content: Text(e is ApiError ? e.message : MutationResult.saveFailedMessage)));
    }
  }

  Future<void> _archive(GroupDetails g) async {
    if (!await confirmAction(
      context,
      title: 'Бүлгийг архивлах уу',
      message: '«${g.name}» жагсаалтаас гарч, кодоор нэгдэх боломжгүй болно, сурагчдын дүн хадгалагдана',
      confirmLabel: 'Архивлах',
    )) {
      return;
    }
    await widget.onArchive();
  }

  Future<void> _copy(String code) async {
    await Clipboard.setData(ClipboardData(text: code));
    if (!mounted) return;
    ScaffoldMessenger.maybeOf(context)
      ?..hideCurrentSnackBar()
      ..showSnackBar(const SnackBar(content: Text('Код хуулагдлаа')));
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(groupDetailsProvider(widget.groupId));
    final g = async.value;
    if (g == null) {
      if (async.hasError) {
        final e = async.error;
        return ErrorState(
          message: e is ApiError ? e.message : AppStrings.genericError,
          onRetry: () => ref.invalidate(groupDetailsProvider(widget.groupId)),
        );
      }
      return const LoadingState(cards: 4);
    }
    final members = [
      for (final m in g.members)
        if (!_hidden.contains(m.studentId)) m,
    ];
    return RefreshIndicator(
      onRefresh: () => ref.refresh(groupDetailsProvider(widget.groupId).future),
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: DetailHeader(
              title: g.name,
              subtitle: g.ownerName.isEmpty ? null : 'Багш ${g.ownerName}',
              chips: [
                MetaChip(label: '${members.length} сурагч', icon: AppIcons.students),
                if (g.createdAt != null) MetaChip(label: DateMn.long(g.createdAt!, withYear: true)),
              ],
              secondary: [
                DetailAction(
                  label: 'Архивлах',
                  icon: AppIcons.historyLog,
                  destructive: true,
                  onPressed: () => unawaited(_archive(g)),
                ),
              ],
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
            sliver: SliverToBoxAdapter(
              child: AppCard(
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Нэгдэх код', style: context.text.bodySmall),
                          const SizedBox(height: AppSpace.xs),
                          SelectableText(
                            g.joinCode,
                            key: const ValueKey('group:code'),
                            style: context.text.headlineSmall?.copyWith(letterSpacing: 3),
                          ),
                          const SizedBox(height: AppSpace.xs),
                          Text('Сурагчид энэ кодоор нэгдэнэ', style: context.text.bodySmall),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Код хуулах',
                      icon: const Icon(AppIcons.copy),
                      onPressed: () => unawaited(_copy(g.joinCode)),
                    ),
                  ],
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
            sliver: SliverToBoxAdapter(child: SectionHeader(title: 'Сурагчид (${members.length})')),
          ),
          if (members.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: EmptyState(
                icon: AppIcons.students,
                title: 'Бүлэгт сурагч алга',
                message: 'Кодоо сурагчдадаа өгөхөд энд гарч ирнэ',
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
              sliver: SliverList.separated(
                itemCount: members.length,
                separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
                itemBuilder: (context, i) => _MemberCard(
                  key: ValueKey('member:${members[i].studentId}'),
                  member: members[i],
                  onRemove: () => unawaited(_remove(members[i])),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _MemberCard extends StatelessWidget {
  const _MemberCard({super.key, required this.member, required this.onRemove});

  final GroupMember member;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final m = member;
    return AppCard(
      padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.sm, AppSpace.xs, AppSpace.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: ItemRow(
                  title: m.name,
                  meta: [
                    if (m.joinedAt != null) 'Нэгдсэн ${DateMn.long(m.joinedAt!)}',
                    if (m.results.isEmpty) 'Дүн алга' else '${m.results.length} дүн',
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Бүлгээс хасах',
                icon: Icon(AppIcons.circleMinus, color: c.inkDim),
                onPressed: onRemove,
              ),
            ],
          ),
          for (final r in m.results)
            Padding(
              padding: const EdgeInsets.only(top: AppSpace.xs, right: AppSpace.md),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      r.testTitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: context.text.bodyMedium,
                    ),
                  ),
                  const SizedBox(width: AppSpace.sm),
                  Text(r.scoreText, style: context.text.labelLarge),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
