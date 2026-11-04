import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/planner_controller.dart';
import '../data/planner_models.dart';
import '../domain/planner_logic.dart';
import 'planner_visuals.dart';

/// Нээлттэй (Төлөвлөсөн + Хийгдэж байгаа + Хоригдсон) даалгавар үүнээс олон бол «Ачаалал ихтэй» (вэбтэй ижил).
const overloadThreshold = 5;

/// «Ачаалал» (вэбийн `WorkloadView`): ажилтан бүрийн тооцоолсон цаг, нээлттэй даалгавар, төлөвийн задаргаа.
class WorkloadScreen extends ConsumerStatefulWidget {
  const WorkloadScreen({super.key});

  @override
  ConsumerState<WorkloadScreen> createState() => _WorkloadScreenState();
}

class _WorkloadScreenState extends ConsumerState<WorkloadScreen> {
  late int _year = ref.read(plannerClockProvider)().year;

  @override
  Widget build(BuildContext context) {
    final rows = ref.watch(plannerWorkloadProvider(_year));
    return Scaffold(
      appBar: AppBar(title: const Text('Ачаалал')),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(plannerWorkloadProvider(_year).future),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(child: _yearBar(context)),
            ...switch (rows) {
              AsyncData(:final value) when value.isEmpty => [
                const SliverFillRemaining(
                  hasScrollBody: false,
                  child: EmptyState(icon: AppIcons.students, title: 'Ажилтны мэдээлэл алга'),
                ),
              ],
              AsyncData(:final value) => [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
                  sliver: SliverList.builder(
                    itemCount: value.length,
                    itemBuilder: (context, i) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpace.sm),
                      child: _WorkloadCard(
                        row: value[i],
                        maxHours: value.fold(1, (m, r) => r.totalEstimateHours > m ? r.totalEstimateHours : m),
                      ),
                    ),
                  ),
                ),
              ],
              AsyncError(:final error) => [
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: ErrorState(
                    message: error is ApiError ? error.message : AppStrings.genericError,
                    onRetry: () => ref.invalidate(plannerWorkloadProvider(_year)),
                  ),
                ),
              ],
              _ => [const SliverToBoxAdapter(child: LoadingState())],
            },
          ],
        ),
      ),
    );
  }

  Widget _yearBar(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(AppSpace.sm, AppSpace.sm, AppSpace.sm, AppSpace.sm),
    child: Row(
      children: [
        IconButton(tooltip: 'Өмнөх жил', icon: const Icon(AppIcons.back), onPressed: () => setState(() => _year--)),
        Text('$_year', style: context.text.titleMedium),
        IconButton(
          tooltip: 'Дараагийн жил',
          icon: const Icon(AppIcons.forward),
          onPressed: () => setState(() => _year++),
        ),
        const SizedBox(width: AppSpace.sm),
        Expanded(child: Text('$_year оны даалгавруудаар', style: context.text.bodySmall)),
      ],
    ),
  );
}

class _WorkloadCard extends StatelessWidget {
  const _WorkloadCard({required this.row, required this.maxHours});

  final WorkloadRow row;
  final int maxHours;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final overloaded = row.openCount >= overloadThreshold;
    final hasAny = row.counts.values.any((n) => n > 0);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(memberName(row.user), style: context.text.titleSmall)),
              Text('${row.totalEstimateHours} цаг', style: context.text.titleSmall),
            ],
          ),
          const SizedBox(height: 2),
          Meta(items: ['${row.openCount} нээлттэй', if (overloaded) 'Ачаалал ихтэй']),
          const SizedBox(height: AppSpace.sm),
          Semantics(
            label: '${memberName(row.user)}: ${row.totalEstimateHours} цаг тооцоолсон',
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.pill),
              child: LinearProgressIndicator(
                value: maxHours == 0 ? 0 : row.totalEstimateHours / maxHours,
                minHeight: 8,
                color: overloaded ? c.warning : c.brand,
                backgroundColor: c.surfaceSunken,
              ),
            ),
          ),
          const SizedBox(height: AppSpace.sm),
          if (!hasAny)
            Text('Энэ хугацаанд даалгавар алга', style: context.text.bodySmall)
          else
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                for (final s in TaskStatus.values)
                  if ((row.counts[s] ?? 0) > 0)
                    MetaChip(label: '${statusLabel(s)} ${row.counts[s]}', icon: statusIcon(s), tone: statusTone(s)),
              ],
            ),
        ],
      ),
    );
  }
}
