import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/content_providers.dart';
import '../data/content_models.dart';
import 'placement_config_view.dart';

/// Түвшин тогтоох шалгалт (`/app/admin/placement`, вэбийн `PlacementAdminClient`): шалгалт өгсөн хүүхдүүд
/// (төлөвөөр шүүх, хайх → дэлгэрэнгүй, дүгнэлт) ба шалгалтын агуулга (Админ, Багш+ засна).
class PlacementAdminScreen extends ConsumerWidget {
  const PlacementAdminScreen({super.key});

  static const path = '/app/admin/placement';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final access = ref.watch(contentAccessProvider);
    if (!access.canOpen) {
      return Scaffold(
        appBar: AppBar(title: const Text('Түвшин тогтоох')),
        body: const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden),
      );
    }
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Түвшин тогтоох'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Хүүхдүүд'),
              Tab(text: 'Агуулга'),
            ],
          ),
        ),
        body: const TabBarView(children: [_Attempts(), PlacementConfigView()]),
      ),
    );
  }
}

class _Attempts extends ConsumerStatefulWidget {
  const _Attempts();

  @override
  ConsumerState<_Attempts> createState() => _AttemptsState();
}

class _AttemptsState extends ConsumerState<_Attempts> {
  DataQuery? _last;

  static final _filters = [for (final s in PlacementStatus.values) DataFilter(s.api, s.label)];

  Future<DataPage<PlacementAttempt>> _load(DataQuery q) async {
    if (q.isFirstPage && q == _last) ref.invalidate(placementsProvider);
    if (q.isFirstPage) _last = q;
    return DataPage.local(
      await ref.read(placementsProvider.future),
      q,
      matches: (r, t) =>
          r.name.toLowerCase().contains(t) || r.phone.contains(t) || (r.school ?? '').toLowerCase().contains(t),
      inFilter: (r, f) => r.status.api == f,
      filters: _filters,
    );
  }

  @override
  Widget build(BuildContext context) {
    return DataListScreen<PlacementAttempt>(
      load: _load,
      itemKey: (r) => r.id,
      searchHint: 'Нэр, утас, сургуулиар хайх',
      filters: _filters,
      countLabel: (n) => '$n хүүхэд',
      emptyTitle: 'Одоогоор шалгалт өгсөн хүүхэд алга',
      emptyMessage: 'Нүүр хуудасны «Түвшин тогтоох шалгалт» холбоосоор хүүхэд шалгалт өгөхөд энд гарч ирнэ',
      emptyIcon: AppIcons.goal,
      onTap: (r) async {
        await context.push('${PlacementAdminScreen.path}/${Uri.encodeComponent(r.id)}');
        _last = null;
      },
      itemBuilder: (context, r) => ItemRow(
        title: r.name,
        meta: ['${r.grade}-р анги', r.school],
        chevron: true,
        subtitle: Padding(
          padding: const EdgeInsets.only(top: AppSpace.xs),
          child: Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.xs,
            children: [
              placementStatusChip(r.status),
              if (r.submittedAt != null)
                MetaChip(label: r.scoreLabel, tone: ChipTone.brand)
              else
                const MetaChip(label: 'Бодож байна'),
              MetaChip(
                label: '${r.photoCount} зураг',
                icon: AppIcons.camera,
                tone: r.photoCount > 0 ? ChipTone.success : ChipTone.error,
              ),
              if (r.level != null && r.level!.isNotEmpty) MetaChip(label: r.level!, tone: ChipTone.info),
              if (r.createdAt != null) MetaChip(label: DateMn.numericWithTime(UbDateTime.fromInstant(r.createdAt!))),
            ],
          ),
        ),
      ),
    );
  }
}

Widget placementStatusChip(PlacementStatus s) => MetaChip(
  label: s.label,
  tone: switch (s) {
    PlacementStatus.newOne => ChipTone.warning,
    PlacementStatus.reviewed => ChipTone.info,
    PlacementStatus.contacted => ChipTone.success,
  },
);
