import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/online_providers.dart';
import '../data/online_models.dart';
import '../domain/online_logic.dart';
import 'online_student_screen.dart';

/// Онлайн сурагчид (`/app/online`, вэбийн `OnlineRosterClient`) — Багш, Багш+, Админ.
///
/// Ангигүй, онлайн эрхтэй сурагчдын идэвх, эрхийн төлөв, амжилт. Эрх нь хүчинтэй хэрнээ идэвхгүй
/// болсон сурагчид хамгийн дээр (эргэж холбогдоход). Хайлт, шүүлтүүр, хуудаслалт серверт.
class OnlineStudentsScreen extends ConsumerStatefulWidget {
  const OnlineStudentsScreen({super.key});

  @override
  ConsumerState<OnlineStudentsScreen> createState() => _OnlineStudentsScreenState();
}

class _OnlineStudentsScreenState extends ConsumerState<OnlineStudentsScreen> {
  static const pageSize = 50;

  static const _filters = [
    DataFilter(OnlineFilters.attention, 'Эрхтэй ч идэвхгүй'),
    DataFilter(OnlineFilters.active, 'Идэвхтэй'),
    DataFilter(OnlineFilters.slowing, 'Сулраж байна'),
    DataFilter(OnlineFilters.dormant, 'Идэвхгүй'),
    DataFilter(OnlineFilters.withPass, 'Идэвхтэй эрхтэй'),
    DataFilter(OnlineFilters.noPass, 'Идэвхтэй эрхгүй'),
  ];

  Future<DataPage<OnlineStudent>> _load(DataQuery q) async {
    final f = OnlineFilters.query(q.filter);
    final page = int.tryParse(q.cursor ?? '') ?? 1;
    final res = await ref
        .read(onlineRepositoryProvider)
        .roster(search: q.search, passStatus: f.passStatus, activity: f.activity, page: page, pageSize: pageSize);
    return DataPage(
      items: priorityFirst(res.items),
      nextCursor: res.hasMore && res.items.isNotEmpty ? '${page + 1}' : null,
      total: res.total,
    );
  }

  void _open(OnlineStudent s) => context.push('/app/online/${Uri.encodeComponent(s.id)}', extra: s.name);

  @override
  Widget build(BuildContext context) {
    final access = ref.watch(onlineAccessProvider);
    final now = ref.watch(onlineNowProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Онлайн сурагчид')),
      body: !access.canView
          ? const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden)
          : DataListScreen<OnlineStudent>(
              load: _load,
              itemKey: (s) => s.id,
              searchHint: 'Код эсвэл нэрээр хайх',
              filters: _filters,
              countLabel: (n) => '$n сурагч',
              emptyTitle: 'Тохирох сурагч олдсонгүй',
              emptyMessage: 'Хайлт эсвэл шүүлтүүрээ өөрчилж үзнэ үү',
              emptyIcon: AppIcons.laptop,
              summaryBuilder: (context, snap) {
                final n = snap.items.where((s) => s.dormantWithPass).length;
                if (n == 0 || snap.query.filter == OnlineFilters.attention) return const SizedBox.shrink();
                return _AttentionBanner(count: n);
              },
              onTap: _open,
              detailBuilder: (_, s) => OnlineStudentView(key: ValueKey(s.id), studentId: s.id),
              itemBuilder: (context, s) => OnlineStudentRow(student: s, now: now),
            ),
    );
  }
}

class _AttentionBanner extends StatelessWidget {
  const _AttentionBanner({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.sm),
    child: AppCard(
      accent: context.colors.error,
      padding: const EdgeInsets.all(AppSpace.md),
      child: Row(
        children: [
          Icon(AppIcons.warning, size: 18, color: context.colors.error),
          const SizedBox(width: AppSpace.sm),
          Expanded(
            child: Text(
              '$count сурагчийн эрх хүчинтэй хэрнээ идэвхгүй болсон, эргэж холбогдох хэрэгтэй. Жагсаалтын дээд хэсэгт байна',
              style: context.text.bodyMedium,
            ),
          ),
        ],
      ),
    ),
  );
}

/// Жагсаалтын мөр: нэр, код, анги, идэвх, эрх, сүүлд идэвхтэй, 30 хоногийн бодлого, амжилт.
class OnlineStudentRow extends StatelessWidget {
  const OnlineStudentRow({super.key, required this.student, required this.now});

  final OnlineStudent student;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final s = student;
    return ItemRow(
      title: s.name,
      meta: [s.studentCode ?? 'Код тодорхойгүй', if (s.grade != null) '${s.grade}-р анги'],
      subtitle: Padding(
        padding: const EdgeInsets.only(top: AppSpace.xs),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.xs,
              children: [
                EngagementChip(level: s.engagement),
                PassChip(pass: s.activePass, now: now),
              ],
            ),
            const SizedBox(height: AppSpace.xs),
            Meta(
              items: [
                'Сүүлд: ${relativeSince(s.lastActiveAt, now)}',
                '30 хоногт ${s.attempts30d} бодлого',
                if (s.successRate != null) 'амжилт ${s.successRate}%',
              ],
              style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
            ),
          ],
        ),
      ),
      chevron: true,
    );
  }
}

/// Идэвхийн чип: дүрс + шошго хамт (өнгөнөөс гадна).
class EngagementChip extends StatelessWidget {
  const EngagementChip({super.key, required this.level});

  final Engagement level;

  @override
  Widget build(BuildContext context) => MetaChip(
    label: level.label,
    icon: switch (level) {
      Engagement.active => AppIcons.flame,
      Engagement.slowing => AppIcons.hourglass,
      Engagement.dormant => AppIcons.circleSlash,
    },
    tone: switch (level) {
      Engagement.active => ChipTone.success,
      Engagement.slowing => ChipTone.warning,
      Engagement.dormant => ChipTone.error,
    },
  );
}

/// Эрхийн чип: «Хүчинтэй», «Удахгүй дуусна» (7 хоног), «Эрхгүй».
class PassChip extends StatelessWidget {
  const PassChip({super.key, required this.pass, required this.now});

  final ActivePass? pass;
  final DateTime now;

  @override
  Widget build(BuildContext context) => switch (passState(pass, now)) {
    PassState.none => const MetaChip(label: 'Эрхгүй', icon: AppIcons.minus),
    PassState.expiringSoon => const MetaChip(label: 'Удахгүй дуусна', icon: AppIcons.hourglass, tone: ChipTone.warning),
    PassState.valid => const MetaChip(label: 'Хүчинтэй', icon: AppIcons.badgeCheck, tone: ChipTone.success),
  };
}
